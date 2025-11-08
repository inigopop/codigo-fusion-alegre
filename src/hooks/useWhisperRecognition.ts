import { useState, useRef, useCallback } from 'react';
import { pipeline, type PipelineType } from '@huggingface/transformers';
import Fuse from 'fuse.js';

// Extender Navigator para incluir gpu (WebGPU)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<any>;
    };
  }
}

interface UseWhisperRecognitionProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  vocabulary?: string[]; // Lista de nombres de productos para mejorar precisión
}

// Detectar si estamos en móvil
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

export const useWhisperRecognition = ({ onTranscript, onError, vocabulary = [] }: UseWhisperRecognitionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMobile] = useState(isMobileDevice());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriberRef = useRef<any>(null);

  // Initialize Whisper model
  const initializeModel = useCallback(async () => {
    if (transcriberRef.current) return;
    
    // No cargar Whisper en móviles (demasiado pesado)
    if (isMobile) {
      onError('Whisper no está disponible en dispositivos móviles. Usa el reconocimiento estándar (desactiva Whisper).');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🎯 Inicializando modelo Whisper...');
      
      // Detectar si WebGPU está disponible
      let device: 'wasm' | 'webgpu' = 'wasm'; // Default fallback
      let dtype: 'q8' | 'fp32' = 'q8'; // Quantized para mejor rendimiento
      
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            console.log('✅ WebGPU disponible, usando aceleración GPU');
            device = 'webgpu';
            dtype = 'fp32';
          }
        } catch (gpuError) {
          console.warn('⚠️ WebGPU no disponible, usando WASM:', gpuError);
        }
      } else {
        console.log('📱 WebGPU no soportado, usando WASM (normal en móviles)');
      }
      
      transcriberRef.current = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny', // Usar tiny en lugar de small para mejor compatibilidad móvil
        { 
          device,
          dtype
        }
      );
      
      console.log(`✅ Modelo Whisper cargado (${device}/${dtype})`);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error cargando modelo:', error);
      setIsLoading(false);
      onError('Error al cargar el modelo. Prueba recargando la página o usando el reconocimiento estándar.');
    }
  }, [onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Initialize model if not already loaded
      if (!transcriberRef.current) {
        await initializeModel();
      }

      // Verificar que el modelo se cargó correctamente
      if (!transcriberRef.current) {
        onError('El modelo no se pudo cargar. Intenta usar el reconocimiento estándar.');
        return;
      }

      // Verificar permisos de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          if (audioBlob.size > 0) {
            await transcribeAudio(audioBlob);
          } else {
            onError('No se grabó audio. Intenta hablar más cerca del micrófono.');
          }
        } catch (error) {
          console.error('❌ Error al procesar audio:', error);
          onError('Error al procesar el audio grabado');
        } finally {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ Error en MediaRecorder:', event);
        onError('Error durante la grabación');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎤 Grabación iniciada con Whisper');
    } catch (error: any) {
      console.error('❌ Error al iniciar grabación:', error);
      if (error.name === 'NotAllowedError') {
        onError('Permiso de micrófono denegado. Permite el acceso al micrófono en la configuración del navegador.');
      } else if (error.name === 'NotFoundError') {
        onError('No se encontró micrófono. Conecta un micrófono e intenta de nuevo.');
      } else {
        onError('Error al acceder al micrófono: ' + error.message);
      }
    }
  }, [initializeModel, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ Grabación detenida');
    }
  }, [isRecording]);

  // Post-procesar transcripción con fuzzy matching MEJORADO
  const correctTranscription = useCallback((text: string): string => {
    if (vocabulary.length === 0) return text;

    console.log('🔍 Corrección con vocabulario - Entrada:', text);

    // Configurar Fuse.js para fuzzy matching MÁS PERMISIVO
    const fuse = new Fuse(vocabulary, {
      includeScore: true,
      threshold: 0.6, // Aumentado de 0.4 a 0.6 para ser más permisivo
      distance: 150, // Aumentado de 100 a 150
      minMatchCharLength: 3,
      ignoreLocation: true, // Ignorar posición de coincidencia
      keys: ['$'], // Buscar en el string completo
    });

    // Dividir el texto en palabras
    const words = text.split(/\s+/);
    let correctedText = text;

    // Primero buscar frases completas (2-4 palabras)
    for (let phraseLen = 4; phraseLen >= 2; phraseLen--) {
      for (let i = 0; i <= words.length - phraseLen; i++) {
        const phrase = words.slice(i, i + phraseLen).join(' ');
        const results = fuse.search(phrase);
        
        if (results.length > 0 && results[0].score && results[0].score < 0.5) {
          const match = results[0].item;
          console.log(`✅ Corrección frase: "${phrase}" → "${match}" (score: ${results[0].score})`);
          correctedText = correctedText.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), match);
        }
      }
    }
    
    // Luego buscar palabras individuales
    words.forEach(word => {
      if (word.length < 3) return;

      const results = fuse.search(word);
      if (results.length > 0 && results[0].score && results[0].score < 0.45) {
        const match = results[0].item;
        console.log(`✅ Corrección palabra: "${word}" → "${match}" (score: ${results[0].score})`);
        correctedText = correctedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), match);
      }
    });

    console.log('📝 Texto corregido:', correctedText);
    return correctedText;
  }, [vocabulary]);

  // Transcribe audio with Whisper
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!transcriberRef.current) {
      onError('Modelo no cargado');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Transcribiendo audio...', audioBlob.size, 'bytes');

      // Verificar que hay audio
      if (audioBlob.size < 100) {
        onError('Audio muy corto o vacío. Intenta grabar de nuevo hablando claramente.');
        setIsLoading(false);
        return;
      }

      // Convert blob to URL for processing
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Crear prompt inicial con vocabulario para guiar a Whisper
      const initialPrompt = vocabulary.length > 0
        ? `Vocabulario de productos: ${vocabulary.slice(0, 30).join(', ')}.` // Reducido a 30 para evitar prompts muy largos
        : undefined;

      console.log('🎯 Iniciando transcripción con Whisper...');

      // Transcribe with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transcripción timeout')), 30000) // 30 segundos timeout
      );

      const transcribePromise = transcriberRef.current(audioUrl, {
        language: 'spanish',
        task: 'transcribe',
        ...(initialPrompt && { initial_prompt: initialPrompt })
      });

      const result = await Promise.race([transcribePromise, timeoutPromise]);
      
      // Cleanup URL object
      URL.revokeObjectURL(audioUrl);

      console.log('📝 Transcripción original:', result.text);
      
      if (!result.text || result.text.trim().length === 0) {
        onError('No se detectó voz en la grabación. Intenta hablar más claro y cerca del micrófono.');
        setIsLoading(false);
        return;
      }
      
      // Corregir transcripción con vocabulario
      const correctedText = correctTranscription(result.text);
      
      onTranscript(correctedText);
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Error en transcripción:', error);
      setIsLoading(false);
      if (error.message === 'Transcripción timeout') {
        onError('La transcripción está tardando mucho. Prueba con un audio más corto o usa el reconocimiento estándar.');
      } else {
        onError('Error al transcribir el audio. Intenta de nuevo o usa el reconocimiento estándar.');
      }
    }
  }, [onTranscript, onError, vocabulary, correctTranscription]);

  return {
    isLoading,
    isRecording,
    startRecording,
    stopRecording,
    initializeModel,
    isMobile
  };
};
