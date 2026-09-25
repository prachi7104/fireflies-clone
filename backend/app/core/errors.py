from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


class DomainError(Exception):
    """An expected failure raised by a service. Mapped to an HTTP status in one place below."""

    status_code = 400

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class UnauthorizedError(DomainError):
    status_code = 401


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class PayloadTooLargeError(DomainError):
    status_code = 413


class UnsupportedMediaError(DomainError):
    status_code = 415


class InvalidInputError(DomainError):
    status_code = 422


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(IntegrityError)
    async def _integrity_error(_request: Request, _exc: IntegrityError) -> JSONResponse:
        # Backstop only: services check the rules first and raise friendlier errors.
        return JSONResponse({"detail": "Request conflicts with existing data"}, status_code=409)
