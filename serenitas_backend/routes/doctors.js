const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const doctorService = require('../services/doctorService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/doctors
 * Get all doctors
 * Access: All authenticated users
 * Requirements: 5.1
 */
router.get('/', auth, async (req, res, next) => {
  try {
    logger.info('GET /api/doctors', { userId: req.user.id, role: req.user.role });

    const doctors = await doctorService.getAllDoctors();

    res.json({
      success: true,
      data: doctors,
      message: 'Médicos recuperados com sucesso'
    });
  } catch (error) {
    logger.error('Error in GET /api/doctors', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/doctors/:id
 * Get doctor by ID
 * Access: All authenticated users
 * Requirements: 5.1
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info('GET /api/doctors/:id', { doctorId: id, userId: req.user.id });

    const doctor = await doctorService.getDoctorById(id);

    res.json({
      success: true,
      data: doctor,
      message: 'Médico recuperado com sucesso'
    });
  } catch (error) {
    if (error.message === 'Médico não encontrado') {
      return res.status(404).json({
        success: false,
        data: null,
        message: error.message,
        error: error.message
      });
    }
    logger.error('Error in GET /api/doctors/:id', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/doctors/:id/patients
 * Get patients assigned to a doctor
 * Access: Doctor (own patients), Admin
 * Requirements: 5.2
 */
router.get('/:id/patients', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    logger.info('GET /api/doctors/:id/patients', { 
      doctorId: id, 
      userId: user.id, 
      role: user.role 
    });

    // Authorization: Doctor can only view their own patients, admin can view any
    if (user.role === 'doctor') {
      // Get doctor record for this user
      const { data: doctorRecord } = await require('../config/supabase')
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorRecord || doctorRecord.id !== id) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Acesso negado',
          error: 'Você só pode visualizar seus próprios pacientes'
        });
      }
    } else if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Acesso negado',
        error: 'Permissões insuficientes'
      });
    }

    const patients = await doctorService.getAssignedPatients(id);

    res.json({
      success: true,
      data: patients,
      message: 'Pacientes recuperados com sucesso'
    });
  } catch (error) {
    if (error.message === 'Médico não encontrado') {
      return res.status(404).json({
        success: false,
        data: null,
        message: error.message,
        error: error.message
      });
    }
    logger.error('Error in GET /api/doctors/:id/patients', { error: error.message });
    next(error);
  }
});

/**
 * PUT /api/doctors/:id
 * Update doctor profile
 * Access: Doctor (own profile), Admin
 * Requirements: 5.2
 */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    logger.info('PUT /api/doctors/:id', { 
      doctorId: id, 
      userId: user.id, 
      role: user.role 
    });

    // Authorization: Doctor can only update their own profile, admin can update any
    if (user.role === 'doctor') {
      const { data: doctorRecord } = await require('../config/supabase')
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorRecord || doctorRecord.id !== id) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Acesso negado',
          error: 'Você só pode atualizar seu próprio perfil'
        });
      }
    } else if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Acesso negado',
        error: 'Permissões insuficientes'
      });
    }

    const updatedDoctor = await doctorService.updateDoctorProfile(
      id,
      req.body,
      user.id
    );

    res.json({
      success: true,
      data: updatedDoctor,
      message: 'Perfil do médico atualizado com sucesso'
    });
  } catch (error) {
    if (error.message === 'Médico não encontrado') {
      return res.status(404).json({
        success: false,
        data: null,
        message: error.message,
        error: error.message
      });
    }
    logger.error('Error in PUT /api/doctors/:id', { error: error.message });
    next(error);
  }
});

module.exports = router;
