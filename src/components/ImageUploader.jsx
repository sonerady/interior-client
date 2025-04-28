import React, { useState, useRef } from "react";
import {
  FiUpload,
  FiImage,
  FiSend,
  FiRefreshCcw,
  FiEdit,
  FiX,
  FiMaximize,
} from "react-icons/fi";
import "./ImageUploader.css";

const ImageUploader = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };

      reader.readAsDataURL(file);
    }
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      alert("Lütfen önce bir resim yükleyin");
      return;
    }

    if (!prompt.trim()) {
      alert("Lütfen bir prompt girin");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Maske resmi oluşturmak için boş bir görüntü kullanabilirsiniz
      // Gerçek uygulamada maske oluşturma mantığını ekleyebilirsiniz
      // Şimdilik aynı resmi kullanıyoruz
      const maskUrl = uploadedImage;

      // Görüntü boyutunu kontrol et (sorun teşhisi için)
      console.log("Görüntü boyutu:", uploadedImage.length, "karakter");
      if (uploadedImage.length > 1000000) {
        console.warn("Görüntü çok büyük, API sorunlarına neden olabilir");
      }

      // API isteği için verileri hazırla
      const requestData = {
        imageUrl: uploadedImage,
        maskUrl: maskUrl,
        prompt: prompt,
        steps: 50,
        guidance: 60,
        outpaint: "None",
        safety_tolerance: 2,
        prompt_upsampling: false,
      };

      console.log("API isteği gönderiliyor:", requestData);

      // API tabanı URL'sini belirle
      const apiBaseUrl = "https://interior-server-imgq.onrender.com";

      // API URL'sini oluştur
      const apiUrl = `${apiBaseUrl}/api/enhance-image`;

      console.log("API endpoint URL:", apiUrl);

      // API'ye istek gönder
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("API yanıt durumu:", response.status, response.statusText);

      // Yanıt içeriğini ham metin olarak al
      const responseText = await response.text();
      console.log("API yanıt içeriği (ham):", responseText);

      // Boş yanıt kontrolü
      if (!responseText || responseText.trim() === "") {
        throw new Error("API yanıtı boş veya geçersiz");
      }

      // JSON parse işlemi
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse hatası:", parseError);
        throw new Error(`JSON ayrıştırma hatası: ${parseError.message}`);
      }

      // API yanıtını kontrol et
      if (!result.success) {
        throw new Error(result.error || "API yanıtında bir hata var");
      }

      console.log("İşlem başarılı! API yanıtı:", result);

      // Oluşturulan görüntü URL'sini al
      // API sonuç URL'sini doğru şekilde almak için kontroller
      let generatedImageUrl;
      if (result.data.api_response && result.data.api_response.output) {
        // Doğrudan API yanıtında çıktı varsa
        generatedImageUrl = Array.isArray(result.data.api_response.output)
          ? result.data.api_response.output[0]
          : result.data.api_response.output;
      } else if (result.data.get_url) {
        // Henüz hazır değilse ve get_url varsa
        console.log(
          "Görüntü henüz hazır değil, get_url kullanılıyor:",
          result.data.get_url
        );
        generatedImageUrl = result.data.get_url;
      } else if (result.data.generated_image_url) {
        // generated_image_url alanı varsa
        generatedImageUrl = result.data.generated_image_url;
      } else {
        console.warn("Sonuç URL'si bulunamadı, tam API yanıtı:", result);
        throw new Error("Oluşturulan görüntü bulunamadı.");
      }

      console.log("Elde edilen görüntü URL'si:", generatedImageUrl);
      setGeneratedImage(generatedImageUrl);

      // Enhanced prompt bilgisini loglama
      if (result.data.enhanced_prompt) {
        console.log(
          "Gemini tarafından geliştirilmiş prompt:",
          result.data.enhanced_prompt
        );
      }
    } catch (err) {
      console.error("Görüntü oluşturma hatası:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleReset = () => {
    setUploadedImage(null);
    setPrompt("");
    setGeneratedImage(null);
    setIsGenerating(false);
    setError(null);
  };

  const openImageModal = () => {
    setShowModal(true);
  };

  const closeImageModal = () => {
    setShowModal(false);
  };

  return (
    <div className="image-uploader-container">
      <div className="upload-section">
        <h2>Resim Dönüştürme</h2>

        <div className="upload-area">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
            ref={fileInputRef}
            style={{ display: "none" }}
          />

          <button className="upload-button" onClick={handleUploadButtonClick}>
            <FiUpload className="icon" />
            Resim Yükle
          </button>

          {uploadedImage && (
            <div className="preview-container">
              <div className="preview-header">
                <p>Yüklenen Resim</p>
                <button className="reset-button" onClick={handleReset}>
                  <FiRefreshCcw className="icon-small" />
                </button>
              </div>
              <img
                src={uploadedImage}
                alt="Yüklenen resim"
                className="preview-image"
              />
            </div>
          )}
        </div>

        <div className="prompt-area">
          <div className="input-label">Dönüşüm İçin Talimatlar:</div>
          <textarea
            className="prompt-input"
            placeholder="Resiminizin nasıl dönüştürülmesini istediğinizi detaylı olarak açıklayın..."
            value={prompt}
            onChange={handlePromptChange}
          />

          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="spinner"></div>
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <FiSend className="icon" />
                <span>Oluştur</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="result-section">
        <h3>Oluşturulan Görsel</h3>
        {isGenerating ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Resim oluşturuluyor...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="retry-button" onClick={handleGenerate}>
              <FiRefreshCcw className="icon" />
              <span>Tekrar Dene</span>
            </button>
          </div>
        ) : generatedImage ? (
          <div className="generated-image-container">
            <div
              className="image-wrapper thumbnail-wrapper"
              onClick={openImageModal}
            >
              <img
                src={generatedImage}
                alt="Oluşturulan resim"
                className="generated-image thumbnail"
              />
              <div className="image-overlay">
                <div className="overlay-content">
                  <FiMaximize className="maximize-icon" />
                  <p className="prompt-used">{prompt}</p>
                  <button
                    className="change-image-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <FiEdit className="icon" />
                    <span>Değiştir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <FiImage className="placeholder-icon" />
            <p>Resim oluşturmak için "Oluştur" butonuna tıklayın</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-button" onClick={closeImageModal}>
              <FiX />
            </button>
            <img
              src={generatedImage}
              alt="Oluşturulan resim"
              className="modal-image"
            />
            <p className="modal-prompt">{prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
