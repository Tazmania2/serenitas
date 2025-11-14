# Code Quality Standards

## SOLID Principles

When writing or refactoring code, always consider:

### Single Responsibility Principle (SRP)
- Each class/module/function should have one reason to change
- Route handlers should delegate business logic to service layers
- Models should only define schema and basic validation
- Separate concerns: data access, business logic, presentation

### Open-Closed Principle (OCP)
- Code should be open for extension, closed for modification
- Use dependency injection for flexibility
- Prefer composition over inheritance
- Design for extensibility without overengineering

### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for their base types
- Maintain consistent interfaces and contracts

### Interface Segregation Principle (ISP)
- Clients shouldn't depend on interfaces they don't use
- Keep interfaces focused and minimal

### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- High-level modules shouldn't depend on low-level modules

## Code Structure Guidelines

### Avoid Overdesign
- Don't introduce unnecessary abstraction layers
- Start simple, refactor when complexity demands it
- Premature optimization is the root of all evil
- Balance between SOLID principles and pragmatism

### Recommended Architecture Layers

```
routes/          # HTTP layer - handle requests/responses
├── validation   # Input validation
└── error handling

services/        # Business logic layer
├── core logic
├── orchestration
└── domain rules

repositories/    # Data access layer
├── database queries
├── data mapping
└── persistence logic

models/          # Data models
└── schema definitions

middleware/      # Cross-cutting concerns
├── authentication
├── authorization
└── logging
```

### When to Extract Services
- Business logic becomes complex (>50 lines in route handler)
- Logic is reused across multiple routes
- Need to test business logic independently
- Multiple data sources need orchestration

### When NOT to Extract
- Simple CRUD operations
- Single database query with no logic
- One-off operations with no reuse potential
