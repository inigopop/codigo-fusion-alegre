
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (productName: string, newStock: number) => void;
  isListening: boolean;
  setIsListening: (value: boolean) => void;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      
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
      const result = 'No hay datos de inventario cargados';
      setCommandResult(result);
      speak(result);
      return;
    }

    // Comando para actualizar stock por voz
    // Formato: "actualizar [producto] a [cantidad]" o "[producto] [cantidad]"
    const updateRegex = /(?:actualizar\s+(.+?)\s+a\s+(\d+(?:[.,]\d+)?)|(.+?)\s+(\d+(?:[.,]\d+)?))/i;
    const match = lowerCommand.match(updateRegex);
    
    if (match) {
      const productName = (match[1] || match[3])?.trim();
      const stockValue = (match[2] || match[4])?.replace(',', '.');
      
      if (productName && stockValue) {
        const stock = parseFloat(stockValue);
        if (!isNaN(stock)) {
          // Buscar el producto más similar
          const foundProduct = excelData.find(item => 
            item.Producto.toLowerCase().includes(productName.toLowerCase()) ||
            productName.toLowerCase().includes(item.Producto.toLowerCase().split(' ')[0])
          );
          
          if (foundProduct) {
            onUpdateStock(foundProduct.Producto, stock);
            const result = `Stock actualizado: ${foundProduct.Producto} = ${stock.toFixed(1)}`;
            setCommandResult(result);
            speak(`Stock actualizado a ${stock.toFixed(1)}`);
          } else {
            const result = `No se encontró el producto: ${productName}`;
            setCommandResult(result);
            speak('Producto no encontrado');
          }
          return;
        }
      }
    }

    // Otros comandos de consulta
    if (lowerCommand.includes('cuántos productos') || lowerCommand.includes('total productos')) {
      const result = `Hay ${excelData.length} productos en el inventario`;
      setCommandResult(result);
      speak(result);
    } else if (lowerCommand.includes('buscar') || lowerCommand.includes('encontrar')) {
      const searchTerm = lowerCommand.split(/buscar|encontrar/)[1]?.trim();
      if (searchTerm) {
        const matches = excelData.filter(row => 
          row.Producto.toLowerCase().includes(searchTerm)
        );
        const result = `Encontré ${matches.length} productos que contienen "${searchTerm}"`;
        setCommandResult(result);
        speak(result);
      }
    } else if (lowerCommand.includes('limpiar') || lowerCommand.includes('borrar')) {
      setCommandResult('');
      setLastCommand('');
      speak('Pantalla limpiada');
    } else {
      const result = 'Comando no reconocido. Prueba: "actualizar [producto] a [cantidad]" o "[producto] [cantidad]"';
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
              Detener Escucha
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Iniciar Control por Voz
            </>
          )}
        </Button>

        <Button
          onClick={() => speak('Control de voz funcionando correctamente')}
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
                <span className="text-sm font-medium text-blue-700">Escuchando comandos de inventario...</span>
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
        <CardHeader>
          <CardTitle className="text-lg">Comandos de Voz para Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><strong>• "Actualizar [producto] a [cantidad]"</strong> - Actualiza el stock de un producto</li>
            <li><strong>• "[producto] [cantidad]"</strong> - Forma corta para actualizar stock</li>
            <li>• "¿Cuántos productos hay?" - Cuenta total de productos</li>
            <li>• "Buscar [término]" - Busca productos por nombre</li>
            <li>• "Limpiar pantalla" - Limpia los resultados</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Ejemplos:</strong> "Actualizar leche a 5.5", "Pan 3.2", "Buscar aceite"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
