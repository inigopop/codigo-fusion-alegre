import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

interface UseWhisperRecognitionProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
}

export const useWhisperRecognition = ({ onTranscript, onError }: UseWhisperRecognitionProps) => {
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
      
      // Transcribe
      const result = await transcriberRef.current(arrayBuffer, {
        language: 'spanish',
        task: 'transcribe'
      });

      console.log('📝 Transcripción:', result.text);
      onTranscript(result.text);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error en transcripción:', error);
      setIsLoading(false);
      onError('Error al transcribir el audio');
    }
  }, [onTranscript, onError]);

  return {
    isLoading,
    isRecording,
    startRecording,
    stopRecording,
    initializeModel
  };
};
