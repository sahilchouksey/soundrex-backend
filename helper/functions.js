exports.create_return_error = (message, status) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

exports.objectHas = (object, property) => {
  return (object.hasOwnProperty(property) && object[property]) || null;
};

exports.objectIsEmpty = (object) => {
  return Object.keys(object).length === 0;
};
