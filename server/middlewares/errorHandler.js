module.exports = (err, req, res, next) => {
  console.error('API Error:', err);

  // Multer file limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'ขนาดไฟล์ภาพเกินขีดจำกัดที่กำหนดไว้ (สูงสุด 5MB)'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
};
