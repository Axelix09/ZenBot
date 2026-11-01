import { parentPort } from 'worker_threads';
import sharp from 'sharp';

parentPort.on('message', async (action) => {
  try {
    let output = null;

    switch (action.task) {
      case 'SCALE_IMAGE': {
        const sourceBuffer = Buffer.from(action.payload);
        output = await sharp(sourceBuffer)
          .resize(action.width || 512, action.height || 512, { fit: 'contain' })
          .toBuffer();
        break;
      }

      case 'COMPUTE_MATH': {
        let total = 0;
        for (let i = 0; i < action.iterations; i++) total += Math.sqrt(i);
        output = { total };
        break;
      }

      default:
        throw new Error(`Acción desconocida en JobRunner: ${action.task}`);
    }

    if (Buffer.isBuffer(output)) {
      parentPort.postMessage({ state: 'OK', binary: true, data: new Uint8Array(output) });
    } else {
      parentPort.postMessage({ state: 'OK', data: output });
    }
  } catch (err) {
    parentPort.postMessage({ state: 'ERROR', message: err.message });
  }
});