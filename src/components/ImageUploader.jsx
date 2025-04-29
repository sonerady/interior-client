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

  // Görüntüyü küçültmek için yardımcı fonksiyon
  const resizeImage = (dataUrl, callback) => {
    const image = new Image();
    image.onload = () => {
      // Genişlik 1000 pikselden küçükse boyutlandırma yapma
      if (image.width <= 1000) {
        callback(dataUrl);
        return;
      }

      const canvas = document.createElement("canvas");
      const width = Math.floor(image.width / 3);
      const height = Math.floor(image.height / 3);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);

      const resizedImage = canvas.toDataURL("image/jpeg", 0.9);
      callback(resizedImage);
    };
    image.src = dataUrl;
  };

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        // Orijinal görüntüyü yükledikten sonra boyutunu küçült
        resizeImage(event.target.result, (resizedImage) => {
          setUploadedImage(resizedImage);
        });
      };

      reader.readAsDataURL(file);
    }
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      alert("Please upload an image first");
      return;
    }

    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // You can use an empty image to create a mask
      // You can add mask creation logic in a real application
      // For now, we're using the same image
      const maskUrl = uploadedImage;

      // Check image size (for troubleshooting)
      console.log("Image size:", uploadedImage.length, "characters");
      if (uploadedImage.length > 1000000) {
        console.warn("Image is too large, may cause API issues");
      }

      // Prepare data for API request
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

      console.log("Sending API request:", requestData);

      // Set API base URL
      const apiBaseUrl = "https://interior-server-imgq.onrender.com";

      // Create API URL
      const apiUrl = `${apiBaseUrl}/api/create-redesign`;

      console.log("API endpoint URL:", apiUrl);

      // Send request to API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("API response status:", response.status, response.statusText);

      // Get response content as raw text
      const responseText = await response.text();
      console.log("API response content (raw):", responseText);

      // Check for empty response
      if (!responseText || responseText.trim() === "") {
        throw new Error("API response is empty or invalid");
      }

      // JSON parsing
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error(`JSON parsing error: ${parseError.message}`);
      }

      // Check API response
      if (!result.success) {
        throw new Error(result.error || "There is an error in API response");
      }

      console.log("Process successful! API response:", result);

      // Get generated image URL
      // Checks to get the correct API result URL
      let generatedImageUrl;
      if (result.data.api_response && result.data.api_response.output) {
        // If output exists directly in API response
        generatedImageUrl = Array.isArray(result.data.api_response.output)
          ? result.data.api_response.output[0]
          : result.data.api_response.output;
      } else if (result.data.get_url) {
        // If not ready yet and get_url exists
        console.log("Image not ready yet, using get_url:", result.data.get_url);
        generatedImageUrl = result.data.get_url;
      } else if (result.data.generated_image_url) {
        // If generated_image_url field exists
        generatedImageUrl = result.data.generated_image_url;
      } else {
        console.warn("Result URL not found, full API response:", result);
        throw new Error("Generated image not found.");
      }

      console.log("Obtained image URL:", generatedImageUrl);
      setGeneratedImage(generatedImageUrl);

      // Log enhanced prompt information
      if (result.data.enhanced_prompt) {
        console.log("Prompt enhanced by Gemini:", result.data.enhanced_prompt);
      }
    } catch (err) {
      console.error("Image generation error:", err);
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
        <h2>Image Transformation</h2>

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
            Upload Image
          </button>

          {uploadedImage && (
            <div className="preview-container">
              <div className="preview-header">
                <p>Uploaded Image</p>
                <button className="reset-button" onClick={handleReset}>
                  <FiRefreshCcw className="icon-small" />
                </button>
              </div>
              <img
                src={uploadedImage}
                alt="Uploaded image"
                className="preview-image"
              />
            </div>
          )}
        </div>

        <div className="prompt-area">
          <div className="input-label">Transformation Instructions:</div>
          <textarea
            className="prompt-input"
            placeholder="Describe in detail how you want your image to be transformed..."
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
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FiSend className="icon" />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="result-section">
        <h3>Generated Image</h3>
        {isGenerating ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Creating image...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="retry-button" onClick={handleGenerate}>
              <FiRefreshCcw className="icon" />
              <span>Try Again</span>
            </button>
          </div>
        ) : generatedImage ? (
          <div className="generated-image-container">
            <div className="image-wrapper thumbnail-wrapper">
              <img
                src={generatedImage}
                alt="Generated image"
                className="generated-image thumbnail"
                onClick={openImageModal}
              />
              <div className="image-overlay">
                <div className="overlay-content">
                  <p className="prompt-used">{prompt}</p>
                  <button
                    className="change-image-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <FiEdit className="icon" />
                    <span>Change</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <FiImage className="placeholder-icon" />
            <p>Click the "Generate" button to create an image</p>
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
              alt="Generated image"
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
