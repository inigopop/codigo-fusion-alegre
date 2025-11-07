import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';
import Fuse from 'fuse.js';

interface UseWhisperRecognitionProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  vocabulary?: string[]; // Lista de nombres de productos para mejorar precisión
}

export const useWhisperRecognition = ({ onTranscript, onError, vocabulary = [] }: UseWhisperRecognitionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriberRef = useRef<any>(null);

  // Initialize Whisper model
  const initializeModel = useCallback(async () => {
    if (transcriberRef.current) return;
    
    try {
      setIsLoading(true);
      console.log('🎯 Inicializando modelo Whisper...');
      
      transcriberRef.current = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-small',
        { 
          device: 'webgpu',
          dtype: 'fp32'
        }
      );
      
      console.log('✅ Modelo Whisper cargado');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error cargando modelo:', error);
      setIsLoading(false);
      onError('Error al cargar el modelo de reconocimiento de voz');
    }
  }, [onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Initialize model if not already loaded
      if (!transcriberRef.current) {
        await initializeModel();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎤 Grabación iniciada con Whisper');
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      onError('Error al acceder al micrófono');
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

  // Post-procesar transcripción con fuzzy matching
  const correctTranscription = useCallback((text: string): string => {
    if (vocabulary.length === 0) return text;

    console.log('🔍 Corrección con vocabulario - Entrada:', text);

    // Configurar Fuse.js para fuzzy matching
    const fuse = new Fuse(vocabulary, {
      includeScore: true,
      threshold: 0.4, // 0 = coincidencia perfecta, 1 = coincidencia débil
      distance: 100,
      minMatchCharLength: 3,
    });

    // Dividir el texto en palabras
    const words = text.split(/\s+/);
    let correctedText = text;

    // Buscar cada palabra en el vocabulario
    words.forEach(word => {
      if (word.length < 3) return; // Ignorar palabras muy cortas

      const results = fuse.search(word);
      if (results.length > 0 && results[0].score && results[0].score < 0.3) {
        // Si hay una coincidencia fuerte, reemplazar
        const match = results[0].item;
        console.log(`✅ Corrección: "${word}" → "${match}" (score: ${results[0].score})`);
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
      console.log('🔄 Transcribiendo audio...');

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Crear prompt inicial con vocabulario para guiar a Whisper
      const initialPrompt = vocabulary.length > 0
        ? `Vocabulario: ${vocabulary.slice(0, 50).join(', ')}.` // Límite de 50 productos
        : undefined;

      // Transcribe
      const result = await transcriberRef.current(arrayBuffer, {
        language: 'spanish',
        task: 'transcribe',
        ...(initialPrompt && { initial_prompt: initialPrompt })
      });

      console.log('📝 Transcripción original:', result.text);
      
      // Corregir transcripción con vocabulario
      const correctedText = correctTranscription(result.text);
      
      onTranscript(correctedText);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error en transcripción:', error);
      setIsLoading(false);
      onError('Error al transcribir el audio');
    }
  }, [onTranscript, onError, vocabulary, correctTranscription]);

  return {
    isLoading,
    isRecording,
    startRecording,
    stopRecording,
    initializeModel
  };
};
