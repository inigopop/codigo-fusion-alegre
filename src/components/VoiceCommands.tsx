
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  isListening: boolean;
  setIsListening: (value: boolean) => void;
}

const VoiceCommands = ({ excelData, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            processVoiceCommand(finalTranscript);
            setLastCommand(finalTranscript);
          } else {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Error de reconocimiento de voz",
          description: "No se pudo procesar el comando de voz",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setIsListening, toast]);

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    console.log('Processing voice command:', lowerCommand);

    if (excelData.length === 0) {
      setCommandResult('No hay datos de Excel cargados para procesar comandos.');
      speak('No hay datos de Excel cargados');
      return;
    }

    // Command processing
    if (lowerCommand.includes('cuántos registros') || lowerCommand.includes('total registros')) {
      const result = `Hay ${excelData.length} registros en total`;
      setCommandResult(result);
      speak(result);
    } else if (lowerCommand.includes('columnas') || lowerCommand.includes('encabezados')) {
      const headers = Object.keys(excelData[0] || {});
      const result = `Las columnas son: ${headers.join(', ')}`;
      setCommandResult(result);
      speak(`Hay ${headers.length} columnas: ${headers.slice(0, 3).join(', ')}`);
    } else if (lowerCommand.includes('primer registro') || lowerCommand.includes('primera fila')) {
      const firstRow = excelData[0];
      if (firstRow) {
        const values = Object.values(firstRow).slice(0, 3);
        const result = `Primer registro: ${values.join(', ')}`;
        setCommandResult(result);
        speak(result);
      }
    } else if (lowerCommand.includes('buscar') || lowerCommand.includes('encontrar')) {
      // Simple search functionality
      const searchTerm = lowerCommand.split('buscar')[1]?.trim() || lowerCommand.split('encontrar')[1]?.trim();
      if (searchTerm) {
        const matches = excelData.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(searchTerm)
          )
        );
        const result = `Encontré ${matches.length} registros que contienen "${searchTerm}"`;
        setCommandResult(result);
        speak(result);
      }
    } else if (lowerCommand.includes('limpiar') || lowerCommand.includes('borrar')) {
      setCommandResult('');
      setLastCommand('');
      speak('Pantalla limpiada');
    } else {
      const result = 'Comando no reconocido. Intenta con: "cuántos registros", "columnas", "primer registro", "buscar [término]"';
      setCommandResult(result);
      speak('Comando no reconocido');
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        toast({
          title: "Reconocimiento de voz no disponible",
          description: "Tu navegador no soporta reconocimiento de voz",
          variant: "destructive",
        });
      }
    }
  };

  const testSpeak = () => {
    speak('Funcionalidad de voz funcionando correctamente');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="flex items-center gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Detener
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Iniciar Escucha
            </>
          )}
        </Button>

        <Button
          onClick={testSpeak}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Volume2 className="w-5 h-5" />
          Probar Voz
        </Button>
      </div>

      {isListening && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">Escuchando...</span>
              </div>
            </div>
            {transcript && (
              <p className="text-sm text-blue-600 mt-2 italic">
                "{transcript}"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {lastCommand && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-700 mb-2">Último comando:</h3>
            <p className="text-sm text-gray-600 italic">"{lastCommand}"</p>
          </CardContent>
        </Card>
      )}

      {commandResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-green-700 mb-2">Resultado:</h3>
            <p className="text-sm text-green-600">{commandResult}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-700 mb-3">Comandos disponibles:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• "¿Cuántos registros hay?" - Cuenta total de registros</li>
            <li>• "¿Qué columnas hay?" - Lista las columnas disponibles</li>
            <li>• "Muestra el primer registro" - Muestra la primera fila</li>
            <li>• "Buscar [término]" - Busca un término en los datos</li>
            <li>• "Limpiar pantalla" - Limpia los resultados</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
