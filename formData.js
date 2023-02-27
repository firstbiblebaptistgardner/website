const fs = require('fs/promises');
const multiparty = require('multiparty');
const ash = require('./ash');
const conf = require('./conf');
const loggerModule = require('./logger');
const logger = new loggerModule.Logger('formData');
const multiparse = (req) => new Promise((res, rej) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    if (err) {
      rej(err);
    } else {
      res({ fields, files });
    }
  });
});

const maybeCleanupFilesAnd400 = async (files) => {
  let deleted = false;
  for (const key in files) {
    for (const number in files[key]) {
      const path = files[key][number].path;
      logger.debug('deleting file', key, number, path);
      await fs.unlink(path);
      deleted = true;
    }
  }
  if (deleted) {
    throw new loggerModule.Error400('too many / wrong files');
  }
};

const getFileInfo = async (path) => {
  const result = await ash.exec(`identify ${path}`);
  const fileInfoTypes = ['path', 'type', 'size', 'geom', 'bits', 'colors', 'bytes', 'u', 'time'];
  const fileInfo = {};
  result.split(' ').forEach((val, i) => fileInfo[fileInfoTypes[i]] = val);
  return fileInfo;
};

const getMedia = async (files) => {
  let deleteAll = false;
  for (const key in files) {
    for (const number in files[key]) {
      if (key != "media" || number != 0) {
        logger.warn('too many / wrong files', key, number); //todo: ban user
        deleteAll = true;
      }
    }
  }
  if (deleteAll) {
    await maybeCleanupFilesAnd400(files);
  }
  const mpFile = files.media[0];
  if(mpFile.originalFilename == ''){
    await fs.unlink(mpFile.path);
    return null;
  }
  const assertDelete400 = async (assertion, reason) => {
    if (!assertion) {
      logger.info(reason);
      await fs.unlink(mpFile.path);
      throw new Error400(reason)
    }
  };
  await assertDelete400(mpFile.size != 0, 'file not recieved');
  await assertDelete400(mpFile.size <= 1048576, 'max 1 meg');
  const fileInfo = await getFileInfo(mpFile.path);
  const [xs, ys] = fileInfo.size.split('x');
  await assertDelete400(xs <= 2000 && ys <= 2000, 'max 2000x2000'); //todo: mp and aspect ratio
  const extensions = {
    'JPEG': 'jpg',
    'GIF': 'gif',
    'PNG': 'png'
  };
  await assertDelete400(['JPEG', 'GIF', 'PNG'].includes(fileInfo.type), 'only jpg, gif, png');
  const media = `${+new Date()}.${extensions[fileInfo.type]}`;
  const newPath = `${conf.imageDir}/${media}`;
  const thumbPath = `${conf.imageDir}/${media.split('.')[0]}_s.jpg`;
  //todo: sort out what happens if mv or thumbnail fails
  await ash.mv(mpFile.path, newPath);
  await ash.exec(`convert ${newPath} -thumbnail 150x150 ${thumbPath}`);
  return media;
};

const deleteMedia = async (media) => {
  await fs.unlink(`${conf.imageDir}/${media}`);
  const name = media.split('.')[0];
  await fs.unlink(`${conf.imageDir}/${name}_s.jpg`);
};

module.exports = {deleteMedia, getMedia, multiparse, maybeCleanupFilesAnd400};