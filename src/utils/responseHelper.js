// src/utils/responseHelper.js
/**
 * Helper to send translated responses
 * Works with i18next middleware (req.t)
 */

export const sendSuccess = (res, translationKey, data = null, statusCode = 200) => {
  const message = res.req?.t ? res.req.t(translationKey) : translationKey;

  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, translationKey, statusCode = 400, additionalData = {}) => {
  const message = res.req?.t ? res.req.t(translationKey) : translationKey;

  return res.status(statusCode).json({
    success: false,
    message,
    ...additionalData
  });
};

export const sendValidationError = (res, errors) => {
  const message = res.req?.t ? res.req.t('errors.validationError') : 'Validation Error';

  return res.status(400).json({
    success: false,
    message,
    errors
  });
};
