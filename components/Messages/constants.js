import { EventStatus } from 'matrix-js-sdk';

export const Status = {
  ...EventStatus,
  UPLOADING: 'uploading',
  NOT_UPLOADED: 'not_uploaded',
};
