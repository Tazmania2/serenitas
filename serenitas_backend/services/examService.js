/**
 * Exam Service
 * 
 * Handles exam-related business logic including file uploads to Supabase Storage,
 * signed URL generation, and exam management.
 * 
 * Requirements: 4.4, 4.5, 10.2, 10.3, 10.4, 10.5, 10.6, 10.10
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const path = require('path');

// Allowed file types for exams
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate file upload
 * 
 * @param {Object} file - File object
 * @param {string} file.mimetype - MIME type
 * @param {number} file.size - File size in bytes
 * @param {string} file.originalname - Original filename
 * @returns {Object} Validation result
 * @throws {Error} If validation fails
 */
function validateFileUpload(file) {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Tipo de arquivo inválido. Permitidos: PDF, JPEG, PNG');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 5MB');
  }

  return {
    valid: true,
    sanitizedFilename: sanitizeFilename(file.originalname)
  };
}

/**
 * Sanitize filename to prevent path traversal attacks
 * 
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  // Remove path separators and special characters
  const sanitized = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);

  return sanitized;
}

/**
 * Upload exam file to Supabase Storage
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} file - File object from multer
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} File upload result with path and URL
 * @throws {Error} If upload fails
 */
async function uploadExamFile(patientId, file, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Uploading exam file', {
      patientId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      requestingUserId
    });

    // Validate file
    const { sanitizedFilename } = validateFileUpload(file);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(sanitizedFilename);
    const basename = path.basename(sanitizedFilename, ext);
    const uniqueFilename = `${patientId}/${timestamp}_${basename}${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('exams')
      .upload(uniqueFilename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      logger.error('Failed to upload file to storage', {
        error: error.message,
        filename: uniqueFilename
      });
      throw new Error('Erro ao fazer upload do arquivo');
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('exams')
      .createSignedUrl(uniqueFilename, 3600);

    if (urlError) {
      logger.error('Failed to generate signed URL', {
        error: urlError.message,
        filename: uniqueFilename
      });
      // Continue without signed URL - can be generated later
    }

    const duration = Date.now() - startTime;
    logger.info('File uploaded successfully', {
      filename: uniqueFilename,
      size: file.size,
      duration
    });

    return {
      file_name: sanitizedFilename,
      file_url: data.path,
      file_size: file.size,
      file_type: file.mimetype,
      signed_url: urlData?.signedUrl || null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Upload exam file error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Generate signed URL for exam file access
 * 
 * @param {string} filePath - File path in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 * @throws {Error} If URL generation fails
 */
async function generateSignedUrl(filePath, expiresIn = 3600) {
  try {
    logger.debug('Generating signed URL', { filePath, expiresIn });

    const { data, error } = await supabase.storage
      .from('exams')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      logger.error('Failed to generate signed URL', {
        error: error.message,
        filePath
      });
      throw new Error('Erro ao gerar URL de acesso ao arquivo');
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Generate signed URL error', {
      filePath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete exam file from storage
 * 
 * @param {string} filePath - File path in storage
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteExamFile(filePath) {
  try {
    logger.info('Deleting exam file', { filePath });

    const { error } = await supabase.storage
      .from('exams')
      .remove([filePath]);

    if (error) {
      logger.error('Failed to delete file from storage', {
        error: error.message,
        filePath
      });
      return false;
    }

    logger.info('File deleted successfully', { filePath });
    return true;
  } catch (error) {
    logger.error('Delete exam file error', {
      filePath,
      error: error.message
    });
    return false;
  }
}

/**
 * Create exam record
 * 
 * @param {Object} examData - Exam data
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Created exam
 * @throws {Error} If creation fails
 */
async function createExam(examData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Creating exam', {
      patientId: examData.patient_id,
      examType: examData.exam_type,
      requestingUserId
    });

    const { data: newExam, error } = await supabase
      .from('exams')
      .insert([{
        ...examData,
        exam_date: examData.exam_date || new Date().toISOString().split('T')[0],
        status: examData.status || 'pending'
      }])
      .select(`
        *,
        patient:patients!exams_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!exams_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to create exam', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao criar exame');
    }

    // Log data creation for audit
    await auditService.logDataModification(
      requestingUserId,
      'exams',
      newExam.id,
      'CREATE',
      null,
      newExam
    );

    const duration = Date.now() - startTime;
    logger.info('Exam created successfully', {
      examId: newExam.id,
      duration
    });

    return newExam;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Create exam error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get exam by ID
 * 
 * @param {string} examId - Exam UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Exam with signed URL
 * @throws {Error} If exam not found
 */
async function getExamById(examId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting exam by ID', { examId, requestingUserId });

    const { data: exam, error } = await supabase
      .from('exams')
      .select(`
        *,
        patient:patients!exams_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!exams_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .eq('id', examId)
      .single();

    if (error) {
      logger.error('Failed to get exam', {
        examId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar exame');
    }

    if (!exam) {
      logger.warn('Exam not found', { examId });
      throw new Error('Exame não encontrado');
    }

    // Generate signed URL if file exists
    if (exam.file_url) {
      try {
        exam.signed_url = await generateSignedUrl(exam.file_url);
      } catch (urlError) {
        logger.warn('Failed to generate signed URL for exam', {
          examId,
          error: urlError.message
        });
      }
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'exams',
      examId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Exam retrieved', { examId, duration });

    return exam;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get exam by ID error', {
      examId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get all exams (filtered by role via RLS)
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.patientId - Filter by patient
 * @param {string} filters.doctorId - Filter by doctor
 * @param {string} filters.status - Filter by status
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of exams
 */
async function getAllExams(filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all exams', { filters, requestingUserId });

    let query = supabase
      .from('exams')
      .select(`
        *,
        patient:patients!exams_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!exams_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .order('exam_date', { ascending: false });

    // Apply filters
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: exams, error } = await query;

    if (error) {
      logger.error('Failed to get exams', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar exames');
    }

    const duration = Date.now() - startTime;
    logger.info('Exams retrieved', {
      count: exams?.length || 0,
      duration
    });

    return exams || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all exams error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update exam
 * 
 * @param {string} examId - Exam UUID
 * @param {Object} updateData - Data to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated exam
 * @throws {Error} If update fails
 */
async function updateExam(examId, updateData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating exam', {
      examId,
      requestingUserId,
      fields: Object.keys(updateData)
    });

    // Get current exam for audit
    const { data: oldExam } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    // Allowed fields to update
    const allowedFields = [
      'exam_type',
      'exam_name',
      'results',
      'status',
      'notes',
      'doctor_notes'
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    filteredData.updated_at = new Date().toISOString();

    const { data: updatedExam, error } = await supabase
      .from('exams')
      .update(filteredData)
      .eq('id', examId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update exam', {
        examId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar exame');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'exams',
      examId,
      'UPDATE',
      oldExam,
      updatedExam
    );

    const duration = Date.now() - startTime;
    logger.info('Exam updated', { examId, duration });

    return updatedExam;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update exam error', {
      examId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Delete exam and associated file
 * 
 * @param {string} examId - Exam UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteExam(examId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Deleting exam', { examId, requestingUserId });

    // Get exam to retrieve file path
    const { data: exam, error: getError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (getError || !exam) {
      logger.warn('Exam not found for deletion', { examId });
      throw new Error('Exame não encontrado');
    }

    // Delete file from storage if exists
    if (exam.file_url) {
      await deleteExamFile(exam.file_url);
    }

    // Delete exam record
    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (deleteError) {
      logger.error('Failed to delete exam', {
        examId,
        error: deleteError.message,
        code: deleteError.code
      });
      throw new Error('Erro ao excluir exame');
    }

    // Log data deletion for audit
    await auditService.logDataModification(
      requestingUserId,
      'exams',
      examId,
      'DELETE',
      exam,
      null
    );

    const duration = Date.now() - startTime;
    logger.info('Exam deleted successfully', { examId, duration });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Delete exam error', {
      examId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

module.exports = {
  validateFileUpload,
  sanitizeFilename,
  uploadExamFile,
  generateSignedUrl,
  deleteExamFile,
  createExam,
  getExamById,
  getAllExams,
  updateExam,
  deleteExam,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
