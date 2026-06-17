export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MemoryNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Memory ${id} was not found`, 'MEMORY_NOT_FOUND');
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
