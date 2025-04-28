import React, { useState, useRef, useEffect } from "react";
import {
  FiUpload,
  FiDownload,
  FiImage,
  FiExternalLink,
  FiX,
  FiLink,
} from "react-icons/fi";
import { BsLightningCharge, BsRobot } from "react-icons/bs";
import "./ImageTransformer.css";

const ImageTransformer = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [designStyle, setDesignStyle] = useState("minimal");
  const [isApiGenerating, setIsApiGenerating] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const canvasRef = useRef(null);

  // Clarity iyileştirme için stateler
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementStatus, setEnhancementStatus] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Modal için stateler
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // Flux Fill ile oluşturulan görüntüyü saklamak için yeni state
  const [fluxFillImageUrl, setFluxFillImageUrl] = useState(null);

  // Gemini prompt oluşturma için state'ler
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  // Supabase ile ilgili state'ler
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedMaskUrl, setUploadedMaskUrl] = useState("");

  // Base64 formatındaki görüntüleri saklamak için
  const [base64Image, setBase64Image] = useState(null);

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const base64String = event.target.result;
          console.log("Orijinal resim okundu (base64)");

          // Orijinal resmi state'e kaydet
          setOriginalImage(base64String);
          setBase64Image(base64String);

          // Orijinal resmi Supabase'e yükle
          console.log("Orijinal resim Supabase'e yükleniyor...");
          const originalImageUrl = await uploadImageToSupabase(
            base64String,
            "original"
          );
          console.log("Orijinal resim URL'i:", originalImageUrl);

          if (originalImageUrl) {
            // Canvas ve maske oluşturma işlemini bekleyin
            console.log("Otomatik maske oluşturma başlatılıyor...");

            // Önce canvas'ın güncellenmesini bekleyin
            setTimeout(async () => {
              try {
                // Canvas kullanarak siyah arkaplan ve büyük beyaz kare ile maske oluşturma
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");

                // Orijinal resmi yükleyip boyutlarını alıyoruz
                const img = new Image();

                img.onload = async () => {
                  // Canvas boyutunu ayarla (orijinal resimle aynı boyutta)
                  canvas.width = img.width;
                  canvas.height = img.height;

                  // Siyah arkaplan
                  context.fillStyle = "black";
                  context.fillRect(0, 0, canvas.width, canvas.height);

                  // Büyük beyaz kare (%95 genişlik ve yükseklikte)
                  const squareWidth = canvas.width * 0.95;
                  const squareHeight = canvas.height * 0.95;
                  const centerX = canvas.width / 2 - squareWidth / 2;
                  const centerY = canvas.height / 2 - squareHeight / 2;

                  context.fillStyle = "white";
                  context.fillRect(centerX, centerY, squareWidth, squareHeight);

                  // Resmi data URL'e dönüştür
                  const maskDataUrl = canvas.toDataURL("image/png");
                  console.log("Maske resmi oluşturuldu (base64)");

                  // Maske resmini state'e kaydet
                  // setMaskImage(maskDataUrl); // State removed
                  // setBase64Mask(maskDataUrl); // Removed base64Mask state

                  // Maske resmini Supabase'e yükle
                  console.log("Maske resmi Supabase'e yükleniyor...");
                  const maskImageUrl = await uploadImageToSupabase(
                    maskDataUrl,
                    "mask"
                  );

                  if (maskImageUrl) {
                    setUploadedMaskUrl(maskImageUrl);
                    console.log("Maske URL'i:", maskImageUrl);
                  }
                };

                // Orijinal resmi yükle
                img.src = base64String;
              } catch (maskError) {
                console.error("Otomatik maske oluşturma hatası:", maskError);
                alert(`Maske oluşturma hatası: ${maskError.message}`);
              }
            }, 500);
          }
        } catch (error) {
          console.error("Resim yükleme hatası:", error);
          alert(`Resim yükleme hatası: ${error.message}`);
        }
      };

      reader.readAsDataURL(selectedFile);
    }
  };

  const generateMask = async () => {
    if (!originalImage) {
      alert("Lütfen önce bir orijinal resim yükleyin");
      return;
    }

    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas bulunamadı");
      }

      const context = canvas.getContext("2d");

      // Önce orijinal resmi yükleyip boyutlarını alıyoruz
      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
          try {
            console.log(
              `Orijinal resim yüklendi. Boyutlar: ${img.width}x${img.height}`
            );

            // Canvas boyutunu ayarla (orijinal resimle aynı boyutta)
            canvas.width = img.width;
            canvas.height = img.height;

            // Siyah arkaplan
            context.fillStyle = "black";
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Büyük beyaz kare (%95 genişlik ve yükseklikte)
            const squareWidth = canvas.width * 0.95;
            const squareHeight = canvas.height * 0.95;
            const centerX = canvas.width / 2 - squareWidth / 2;
            const centerY = canvas.height / 2 - squareHeight / 2;

            context.fillStyle = "white";
            context.fillRect(centerX, centerY, squareWidth, squareHeight);

            // Resmi data URL'e dönüştür
            const maskDataUrl = canvas.toDataURL("image/png");
            console.log("Maske resmi oluşturuldu (base64)");

            // State'leri güncelle
            // setMaskImage(maskDataUrl); // State removed
            // setBase64Mask(maskDataUrl); // Removed base64Mask state

            // Oluşturulan maske resmini Supabase'e yükle
            console.log("Maske resmi Supabase'e yükleniyor...");
            try {
              const uploadedUrl = await uploadImageToSupabase(
                maskDataUrl,
                "mask"
              );
              console.log("Maske resmi Supabase'e yüklendi:", uploadedUrl);

              if (uploadedUrl) {
                setUploadedMaskUrl(uploadedUrl);
                console.log("Maske URL'i state'e kaydedildi:", uploadedUrl);
              }

              resolve(uploadedUrl);
            } catch (uploadError) {
              console.error("Maske yükleme hatası:", uploadError);
              // Yükleme hatası olsa bile mask resmi local olarak oluşturuldu
              alert(
                "Maske oluşturuldu ancak Supabase'e yüklenirken hata oluştu: " +
                  uploadError.message
              );
              resolve(null);
            }
          } catch (err) {
            console.error("Maske oluşturma hatası:", err);
            reject(err);
          }
        };

        img.onerror = (err) => {
          console.error("Orijinal resim yüklenirken hata:", err);
          reject(new Error("Orijinal resim yüklenemedi"));
        };

        // Orijinal resmi canvas'a yükle
        img.src = originalImage;
      });
    } catch (error) {
      console.error("Maske oluşturma hatası:", error);
      alert(`Maske oluşturma hatası: ${error.message}`);
      return null;
    }
  };

  // Görüntüyü Clarity ile iyileştir
  const enhanceImageWithClarity = async (imageUrl) => {
    if (!imageUrl) {
      alert("İyileştirilecek görüntü URL'si bulunamadı");
      return;
    }

    setIsEnhancing(true);
    setEnhancementStatus("Görüntü iyileştirme başlatılıyor...");
    setPredictionId(null);
    setEnhancedImage(null);

    try {
      // Sunucu adresi tanımla
      const apiBaseUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5001";
      const enhanceUrl = `${apiBaseUrl}/api/enhance-image`;

      console.log("Clarity API isteği gönderiliyor:", enhanceUrl);

      const requestData = {
        imageUrl: imageUrl,
        prompt: prompt, // Mevcut promptu kullan
        scale_factor: 4,
        dynamic: 6,
      };

      console.log("İyileştirme için kullanılan parametreler:", requestData);

      const response = await fetch(enhanceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log(
        "İyileştirme API yanıtı:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("İyileştirme API hata yanıtı:", errorText);
        throw new Error(
          `İyileştirme hatası: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("İyileştirme API yanıt verisi:", data);

      if (data.success) {
        // Başlangıçta başarılı bir yanıt, ancak işlem tamamlanmayabilir
        setEnhancementStatus(
          `İyileştirme işlemi başlatıldı, durum: ${data.data.status}`
        );
        setPredictionId(data.data.prediction_id);

        // İyileştirme başarılı olduğunda orijinal görüntüyü sakla
        if (imageUrl) {
          setFluxFillImageUrl(imageUrl);
        }

        // Durumu periyodik olarak kontrol et
        startPollingPredictionStatus(data.data.prediction_id, apiBaseUrl);
      } else {
        console.error("İyileştirme API başarısız yanıt:", data);
        throw new Error(
          `İyileştirme hatası: ${data.error || "Bilinmeyen API hatası"}`
        );
      }
    } catch (error) {
      console.error("İyileştirme hatası:", error);
      setEnhancementStatus(`İyileştirme başarısız: ${error.message}`);
    }
  };

  // Tahmin durumunu periyodik olarak kontrol et
  const startPollingPredictionStatus = (id, apiBaseUrl) => {
    // Önceki zamanlayıcıyı temizle
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // İşlemi başlattığımızda görüntüyü gizle
    setGeneratedImage(null);

    const interval = setInterval(async () => {
      try {
        const statusUrl = `${apiBaseUrl}/api/prediction-status/${id}`;
        console.log("Tahmin durumu kontrol ediliyor:", statusUrl);

        const response = await fetch(statusUrl);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Durum kontrolü hatası:", errorText);
          throw new Error(
            `Durum kontrolü başarısız: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Tahmin durumu:", data);

        if (data.success) {
          setEnhancementStatus(`İyileştirme durumu: ${data.data.status}`);

          // İşlem tamamlandıysa
          if (data.data.status === "succeeded") {
            // Eğer output varsa, görüntüyü göster
            if (data.data.output && data.data.output[0]) {
              setEnhancedImage(data.data.output[0]);
              setGeneratedImage(data.data.output[0]); // Ana görüntüyü de güncelle
              setEnhancementStatus("İyileştirme tamamlandı!");
              setIsEnhancing(false); // İyileştirme işlemi bitti
              clearInterval(interval);
              setPollInterval(null);
            } else {
              setEnhancementStatus(
                "İyileştirme tamamlandı fakat görüntü alınamadı"
              );
              setIsEnhancing(false); // İyileştirme işlemi bitti
              clearInterval(interval);
              setPollInterval(null);
            }
          } else if (data.data.status === "failed") {
            setEnhancementStatus(`İyileştirme başarısız oldu`);
            setIsEnhancing(false); // İyileştirme işlemi bitti
            clearInterval(interval);
            setPollInterval(null);
          }
          // Diğer durumlarda (processing, starting vb.) kontrol etmeye devam et
        } else {
          throw new Error(`Durum kontrolü hatası: ${data.error}`);
        }
      } catch (error) {
        console.error("Durum kontrolü hatası:", error);
        setEnhancementStatus(`Durum kontrolü hatası: ${error.message}`);
        setIsEnhancing(false); // Hata durumunda işlemi bitir
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 3000); // 3 saniyede bir kontrol et

    setPollInterval(interval);
  };

  // Component unmount olduğunda interval'ı temizle
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Gemini ile prompt oluşturma
  const generatePromptWithGemini = async () => {
    if (!prompt) {
      alert("Lütfen önce bir prompt girin");
      return;
    }

    try {
      // Sunucu adresi tanımla (geliştirme veya üretim)
      const apiBaseUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5001";

      const geminiUrl = `${apiBaseUrl}/api/generate-prompt`;

      console.log("Gemini API isteği gönderiliyor:", geminiUrl);

      // İstek verilerini hazırla - base64 resim verisini de dahil et
      const requestData = {
        userPrompt: prompt,
        imageData: base64Image, // Orijinal yüklenen resim
      };

      console.log("Gemini için kullanıcı promptu:", prompt);
      console.log(
        "Orijinal resim verisi gönderiliyor:",
        base64Image ? "Evet" : "Hayır"
      );

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API hata yanıtı:", errorText);
        throw new Error(
          `Gemini hatası: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Gemini yanıtı:", data);

      if (data.success && data.generatedPrompt) {
        // Oluşturulan promptu kaydet ve ana promptu değiştir
        setGeneratedPrompt(data.generatedPrompt);
        setPrompt(data.generatedPrompt);

        console.log(
          "Gemini tarafından oluşturulan prompt:",
          data.generatedPrompt
        );
      } else {
        throw new Error("Gemini yanıtından prompt alınamadı");
      }
    } catch (error) {
      console.error("Prompt oluşturma hatası:", error);
      alert(`Prompt oluşturulamadı: ${error.message}`);
    }
  };

  // Gemini ile prompt oluşturma ve Flux Fill'e gönderme
  const generateWithGeminiAndFluxFill = async () => {
    if (!prompt || !uploadedMaskUrl) {
      alert("Lütfen bir prompt ve maske resmi yükleyin");
      return;
    }

    setIsApiGenerating(true);
    setApiResponse(null);

    try {
      console.log("Gemini API isteği hazırlanıyor...");

      // Sunucu adresi tanımla (geliştirme veya üretim)
      const apiBaseUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5001";

      // 1. Adım: Gemini ile detaylı prompt oluştur
      await generatePromptWithGemini();
      const detailedPrompt = generatedPrompt || prompt;

      // 2. Adım: Flux Fill API'sine gönder
      console.log("FluxFill API isteği hazırlanıyor...");

      // Use uploaded URLs directly
      const finalImageUrl = uploadedImageUrl;
      const finalMaskUrl = uploadedMaskUrl;

      if (!finalImageUrl || !finalMaskUrl) {
        alert(
          "Resim veya maske URL'si bulunamadı. Lütfen tekrar resim yükleyin."
        );
        setIsApiGenerating(false);
        return;
      }

      console.log("Kullanılan görsel URL'leri:", {
        imageUrl: finalImageUrl,
        maskUrl: finalMaskUrl,
      });

      // JSON verisini hazırla
      const fluxFillRequestData = {
        imageUrl: finalImageUrl,
        maskUrl: finalMaskUrl,
        prompt: detailedPrompt,
        steps: 50,
        guidance: 60,
        outpaint: "None",
        safety_tolerance: 2,
        prompt_upsampling: false,
      };

      const fluxFillUrl = `${apiBaseUrl}/api/generate-interior-from-url`;

      console.log("FluxFill API isteği gönderiliyor. Endpoint:", fluxFillUrl);
      console.log("FluxFill API isteği içeriği:", fluxFillRequestData);

      const fluxFillResponse = await fetch(fluxFillUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fluxFillRequestData),
        mode: "cors",
        credentials: "same-origin",
      });

      console.log(
        "FluxFill API yanıtı alındı:",
        fluxFillResponse.status,
        fluxFillResponse.statusText
      );

      if (!fluxFillResponse.ok) {
        let errorText;
        try {
          errorText = await fluxFillResponse.text();
          console.error("FluxFill API hata yanıtı:", errorText);
        } catch (err) {
          errorText = "Hata yanıtı okunamadı";
          console.error("FluxFill API hata yanıtı okunamadı:", err);
        }

        throw new Error(
          `Sunucu hatası: ${fluxFillResponse.status} ${
            fluxFillResponse.statusText
          }${errorText ? ` - ${errorText}` : ""}`
        );
      }

      let fluxFillData;
      try {
        fluxFillData = await fluxFillResponse.json();
        console.log("FluxFill API yanıt verisi:", fluxFillData);
      } catch (jsonError) {
        console.error("JSON çözümleme hatası:", jsonError);
        throw new Error(`Sunucu yanıtı anlaşılamadı: ${jsonError.message}`);
      }

      if (fluxFillData.success) {
        setApiResponse(fluxFillData);
        const generatedUrl = fluxFillData.data.generated_image_url;
        setGeneratedImage(generatedUrl);
        setFluxFillImageUrl(generatedUrl);

        // Enhanced kontrolü yap - eğer görüntü zaten iyileştirilmişse, Clarity'e gönderme
        if (generatedUrl && typeof generatedUrl === "string") {
          await enhanceImageWithClarity(generatedUrl);
        }
      } else {
        console.error("FluxFill API başarısız yanıt:", fluxFillData);
        throw new Error(
          `API hatası: ${fluxFillData.error || "Bilinmeyen sunucu hatası"}`
        );
      }
    } catch (error) {
      console.error("İşlem hatası:", error);
      setApiResponse({
        error: true,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      alert(`İşlem hatası: ${error.message}`);
    } finally {
      setIsApiGenerating(false);
    }
  };

  // Gemini ile prompt oluşturma ve doğrudan Clarity ile iyileştirme
  const generateWithGeminiAndClarity = async () => {
    if (!prompt || !base64Image) {
      alert("Lütfen bir prompt girin ve resim yükleyin");
      return;
    }

    setIsApiGenerating(true);
    setApiResponse(null);

    try {
      console.log(
        "Gemini ile prompt oluşturma ve doğrudan Clarity'e gönderme akışı başlatıldı"
      );

      // Sunucu adresi tanımla (geliştirme veya üretim)
      const apiBaseUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5001";

      // 1. Adım: Gemini ile detaylı prompt oluştur
      console.log("Gemini ile detaylı prompt oluşturuluyor...");
      await generatePromptWithGemini();
      const detailedPrompt = generatedPrompt || prompt;

      // 2. Adım: Doğrudan Clarity API'sine gönder
      console.log("Orijinal görüntü doğrudan Clarity API'sine gönderiliyor...");

      // Use the uploaded image URL
      const finalImageUrl = uploadedImageUrl;

      if (!finalImageUrl) {
        throw new Error(
          "İyileştirilecek görüntü URL'i bulunamadı. Lütfen tekrar resim yükleyin."
        );
      }

      // Clarity API'sine gönder
      setIsEnhancing(true);
      setEnhancementStatus("Görüntü iyileştirme başlatılıyor...");
      setGeneratedImage(null);

      const enhanceUrl = `${apiBaseUrl}/api/enhance-image`;

      const requestData = {
        imageUrl: finalImageUrl,
        prompt: detailedPrompt,
        scale_factor: 4,
        dynamic: 6,
      };

      console.log("Clarity API isteği gönderiliyor:", enhanceUrl);
      console.log("İyileştirme için kullanılan parametreler:", requestData);

      const response = await fetch(enhanceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log(
        "İyileştirme API yanıtı:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("İyileştirme API hata yanıtı:", errorText);
        throw new Error(
          `İyileştirme hatası: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("İyileştirme API yanıt verisi:", data);

      if (data.success) {
        // Başlangıçta başarılı bir yanıt, ancak işlem tamamlanmayabilir
        setEnhancementStatus(
          `İyileştirme işlemi başlatıldı, durum: ${data.data.status}`
        );
        setPredictionId(data.data.prediction_id);
        setFluxFillImageUrl(finalImageUrl);

        // Durumu periyodik olarak kontrol et
        startPollingPredictionStatus(data.data.prediction_id, apiBaseUrl);

        // API yanıtını kaydet
        setApiResponse(data);
      } else {
        console.error("İyileştirme API başarısız yanıt:", data);
        throw new Error(
          `İyileştirme hatası: ${data.error || "Bilinmeyen API hatası"}`
        );
      }
    } catch (error) {
      console.error("İşlem hatası:", error);
      setApiResponse({
        error: true,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      alert(`İşlem hatası: ${error.message}`);
      setIsEnhancing(false);
    } finally {
      setIsApiGenerating(false);
    }
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = "generated_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Görüntüyü modal'da aç
  const openImageInModal = (imageUrl) => {
    setModalImage(imageUrl);
    setShowModal(true);
  };

  // Modal'ı kapat
  const closeModal = () => {
    setShowModal(false);
    setModalImage(null);
  };

  // Resmi Supabase'e yükle
  const uploadImageToSupabase = async (base64Image, type) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Sunucu adresi tanımla
      const apiBaseUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:5001";

      const uploadUrl = `${apiBaseUrl}/api/upload-image`;

      console.log(`${type} resmi yükleniyor...`);

      // Rastgele bir dosya adı oluştur
      const timestamp = new Date().getTime();
      const randomId = Math.floor(Math.random() * 10000);
      const fileName = `${type}_image_${timestamp}_${randomId}`;

      setUploadProgress(30);

      // API'ye istek gönder
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: base64Image,
          fileName: fileName,
          type: type,
        }),
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Yükleme hatası: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`${type} resmi yükleme yanıtı:`, data);

      setUploadProgress(100);

      if (data.success && data.data && data.data.imageUrl) {
        // Resim türüne göre ilgili URL'i güncelle
        if (type === "original") {
          setUploadedImageUrl(data.data.imageUrl);
          console.log("Orijinal resim URL'i güncellendi:", data.data.imageUrl);
        } else if (type === "mask") {
          setUploadedMaskUrl(data.data.imageUrl);
          console.log("Maske resmi URL'i güncellendi:", data.data.imageUrl);
        }

        return data.data.imageUrl;
      } else {
        throw new Error("Yükleme başarılı, ancak URL alınamadı.");
      }
    } catch (error) {
      console.error(`${type} resmi yükleme hatası:`, error);
      alert(`Resim yükleme hatası: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="transformer-container">
      <div className="input-section">
        <div className="upload-section">
          <label htmlFor="image-upload" className="upload-btn">
            <FiUpload className="button-icon" />
            Orijinal Resim Yükle
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
          </label>
        </div>

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p>Resim yükleniyor... %{uploadProgress}</p>
          </div>
        )}

        <div className="uploaded-urls">
          {uploadedImageUrl && (
            <div className="url-display">
              <span className="url-label">
                <FiLink /> Orijinal Resim URL:
              </span>
              <div className="url-value">
                <input type="text" value={uploadedImageUrl} readOnly />
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedImageUrl);
                    alert("URL kopyalandı!");
                  }}
                >
                  Kopyala
                </button>
              </div>
            </div>
          )}

          {uploadedMaskUrl && (
            <div className="url-display">
              <span className="url-label">
                <FiLink /> Maske Resim URL:
              </span>
              <div className="url-value">
                <input type="text" value={uploadedMaskUrl} readOnly />
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedMaskUrl);
                    alert("URL kopyalandı!");
                  }}
                >
                  Kopyala
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="prompt-section">
          <div className="prompt-header">
            <label>Prompt</label>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Örneğin, 'minimal bir ev tasarımı', 'lüks endüstriyel ofis', 'sıcak Akdeniz stili' gibi bir tasarım konsepti yazın."
            rows={4}
          />
          {generatedPrompt && (
            <div className="generated-prompt-preview">
              <h4>Gemini tarafından oluşturulan detaylı prompt:</h4>
              <p>{generatedPrompt.substring(0, 200)}...</p>
              <button
                className="copy-prompt-btn"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                }}
              >
                Promptu Kopyala
              </button>
            </div>
          )}
        </div>

        <div className="settings-section">
          <div className="setting">
            <label>Interior Design Style</label>
            <select
              value={designStyle}
              onChange={(e) => setDesignStyle(e.target.value)}
              className="style-select"
            >
              <option value="minimal">Minimal</option>
              <option value="modern">Modern</option>
              <option value="scandinavian">Scandinavian</option>
              <option value="industrial">Industrial</option>
              <option value="bohemian">Bohemian</option>
              <option value="mid-century">Mid-Century Modern</option>
              <option value="contemporary">Contemporary</option>
              <option value="traditional">Traditional</option>
              <option value="rustic">Rustic</option>
              <option value="coastal">Coastal</option>
            </select>
          </div>
        </div>

        {originalImage && (
          <div className="thumbnail-container">
            <div className="thumbnail">
              <img src={originalImage} alt="Uploaded" />
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="usage-instructions">
          <ol>
            <li>
              <strong>Orijinal Resim Yükleyin</strong> butonuyla resminizi seçin
            </li>
            <li>
              Resim otomatik olarak yüklenecek ve maske de otomatik
              oluşturulacak
            </li>
            <li>İki resmin de URL'leri ekranda görünecektir</li>
            <li>Prompt girin ve tasarım oluşturun</li>
          </ol>
        </div>

        <button
          className="api-generate-btn gemini-flux-btn"
          onClick={generateWithGeminiAndClarity}
          disabled={isApiGenerating || !prompt || !uploadedImageUrl}
          style={{ bottom: "135px", backgroundColor: "#8e44ad" }}
        >
          <BsRobot className="button-icon" />
          {isApiGenerating
            ? "Gemini + Clarity ile Oluşturuluyor..."
            : "Gemini + Clarity ile Oluştur"}
        </button>

        <button
          className="api-generate-btn gemini-flux-btn"
          onClick={generateWithGeminiAndFluxFill}
          disabled={isApiGenerating || !prompt || !uploadedMaskUrl}
          style={{ bottom: "75px" }}
        >
          <BsRobot className="button-icon" />
          {isApiGenerating
            ? "Gemini + Flux Fill ile Oluşturuluyor..."
            : "Gemini + Flux Fill ile Oluştur"}
        </button>
      </div>

      <div className="output-section">
        <div className="output-header">
          <h2>Generated Image</h2>
          {generatedImage && !isEnhancing && (
            <button className="download-btn" onClick={downloadGeneratedImage}>
              <FiDownload className="button-icon" /> Download
            </button>
          )}
        </div>
        <div className="generated-image-container">
          {generatedImage && !isEnhancing ? (
            <>
              <img
                src={generatedImage}
                alt="Generated"
                className="generated-image"
                onClick={() => openImageInModal(generatedImage)}
              />
              {!isEnhancing && !enhancedImage && (
                <button
                  className="enhance-btn"
                  onClick={() => enhanceImageWithClarity(generatedImage)}
                  disabled={isEnhancing}
                >
                  <FiImage className="button-icon" />
                  {isEnhancing ? "İyileştiriliyor..." : "Clarity ile İyileştir"}
                </button>
              )}
              {enhancedImage && (
                <div className="enhanced-badge">
                  ✨ Clarity Upscaler ile iyileştirildi
                </div>
              )}
            </>
          ) : isEnhancing ? (
            <div className="processing-container">
              <div className="loader"></div>
              <p>{enhancementStatus || "Görüntü iyileştiriliyor..."}</p>
            </div>
          ) : (
            <div className="placeholder-output">
              <FiImage style={{ fontSize: "40px", color: "#bbb" }} />
              Your generated image will appear here
            </div>
          )}
        </div>

        {apiResponse && (
          <div className="api-response">
            <h3>API Yanıtı:</h3>
            {isEnhancing && (
              <div className="enhancement-status">
                <h4>Clarity Upscaler Durumu:</h4>
                <p>{enhancementStatus || "İşlem başlatılıyor..."}</p>
                {predictionId && (
                  <p>
                    <small>Tahmin ID: {predictionId}</small>
                  </p>
                )}
              </div>
            )}
            {enhancedImage && (
              <div className="enhanced-image-info">
                <p>
                  ✨ <strong>Görüntü başarıyla iyileştirildi!</strong>
                </p>
                <a
                  href={enhancedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  İyileştirilmiş görüntüyü yeni sekmede aç
                </a>
              </div>
            )}
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}
      </div>

      {showModal && (
        <div className="image-modal-overlay" onClick={closeModal}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={closeModal}>
              <FiX />
            </button>
            <img src={modalImage} alt="Full size" className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageTransformer;
