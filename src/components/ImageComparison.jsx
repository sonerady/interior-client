import React, { useState } from "react";
import "./ImageComparison.css";

const ImageComparison = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);

  const handleOriginalImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target.result);
        // Normalde burada bir API çağrısı yapılacak, şimdilik aynı görseli koyalım
        setTimeout(() => {
          setResultImage(event.target.result);
        }, 1000);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="image-comparison-container">
      <div className="image-section">
        <div className="image-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleOriginalImageChange}
            className="file-input"
            id="room-image-input"
          />
          {originalImage ? (
            <img
              src={originalImage}
              alt="Original Room"
              className="room-image"
            />
          ) : (
            <div className="placeholder">
              <div className="upload-icon">+</div>
              <p>Orijinal Oda Görüntüsü Yükle</p>
              <small>Resim seçmek için tıklayın</small>
            </div>
          )}
        </div>
      </div>
      <div className="image-section">
        <div className="image-upload">
          {resultImage ? (
            <img src={resultImage} alt="Result" className="room-image" />
          ) : (
            <div className="placeholder">
              <p>Tasarım Sonucu</p>
              <small>
                Sol taraftan bir görsel yüklediğinizde sonuç burada görünecek
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageComparison;
