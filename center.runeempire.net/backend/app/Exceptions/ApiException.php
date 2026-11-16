<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * One API error the player can get, as its own class (like Spring Boot's
 * exceptions): `throw new AccountLocked()`. Each subclass declares
 *
 *     public const string CODE = 'area.reason';  // stable, never renamed
 *     public const int STATUS = 422;
 *
 * and passes its Hungarian message. Being an HttpException, it keeps its
 * status and headers (Retry-After) and is not written to the log: a refusal
 * is expected, not a fault. A failure of an outside service is reported
 * where it is caught, before this is thrown with it as $previous.
 */
abstract class ApiException extends HttpException
{
    /**
     * Placeholders only: PHP has no abstract constants. ErrorCatalogueTest
     * fails any subclass that does not declare both itself.
     */
    public const string CODE = '';

    public const int STATUS = 500;

    /**
     * @param  array<string, string|int>  $headers
     */
    public function __construct(string $message, array $headers = [], ?Throwable $previous = null)
    {
        parent::__construct(static::STATUS, $message, $previous, $headers);
    }

    /**
     * Field errors for a refusal that answers on a field, like Laravel's.
     *
     * @return array<string, list<string>>|null
     */
    public function errors(): ?array
    {
        return null;
    }

    /**
     * Extra data of this error, sent under `details`.
     *
     * @return array<string, mixed>
     */
    public function details(): array
    {
        return [];
    }

    public function render(): JsonResponse
    {
        return ApiErrorResponse::make(static::CODE, $this->getMessage(), $this->getStatusCode(), $this->getHeaders(), $this->errors(), $this->details());
    }
}
