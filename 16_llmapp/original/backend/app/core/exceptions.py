from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class AuthenticationError(AppError):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(code="authentication_error", message=message, status_code=401)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(code="not_found", message=message, status_code=404)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(code="conflict", message=message, status_code=409)


class ProviderError(AppError):
    def __init__(
        self, message: str = "LLM provider error", details: dict | None = None
    ):
        super().__init__(
            code="provider_error", message=message, status_code=502, details=details
        )


async def app_exception_handler(_request: Request, exc: AppError) -> JSONResponse:
    body: dict = {"code": exc.code, "message": exc.message}
    if exc.details:
        body["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content={"error": body})
