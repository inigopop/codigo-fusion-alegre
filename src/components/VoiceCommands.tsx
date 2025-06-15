
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (index: number, newStock: number) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Procesar vocabulario del Excel para mejorar reconocimiento
  const processVocabulary = useCallback(() => {
    if (excelData.length === 0) return [];
    
    const vocabulary = new Set<string>();
    
    excelData.forEach(item => {
      // Extraer palabras de los productos
      if (item.Producto) {
        const words = item.Producto.toLowerCase()
          .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales
          .split(/\s+/)
          .filter((word: string) => word.length > 2);
        words.forEach((word: string) => vocabulary.add(word));
      }
      
      // Añadir códigos de material si existen
      if (item.Material) {
        vocabulary.add(item.Material.toLowerCase());
      }
    });
    
    return Array.from(vocabulary);
  }, [excelData]);

  // Función para crear variaciones fonéticas básicas
  const createPhoneticVariations = (word: string): string[] => {
    const variations = [word];
    
    // Variaciones comunes en español
    const phoneticMap: { [key: string]: string } = {
      'c': 'k',
      'k': 'c',
      'z': 's',
      's': 'z',
      'b': 'v',
      'v': 'b',
      'g': 'j',
      'j': 'g'
    };
    
    Object.entries(phoneticMap).forEach(([from, to]) => {
      if (word.includes(from)) {
        variations.push(word.replace(new RegExp(from, 'g'), to));
      }
    });
    
    return variations;
  };

  const setupRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Reconocimiento de voz no disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configuración mejorada
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 5;
    
    // Procesar vocabulario del Excel
    const vocabulary = processVocabulary();
    console.log('📚 Vocabulario procesado:', vocabulary.length, 'palabras');
    
    recognition.onstart = () => {
      console.log('🎤 Reconocimiento iniciado');
      setIsListening(true);
      setTranscript('Escuchando...');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        console.log('🎯 Comando final:', finalTranscript);
        processVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Error de reconocimiento:', event.error);
      handleRecognitionError(event.error);
    };

    recognition.onend = () => {
      console.log('⏹️ Reconocimiento terminado');
      if (isListening && !isProcessing) {
        // Auto-reiniciar si no se detuvo manualmente
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log('🔄 Auto-reinicio fallido');
            }
          }
        }, 500);
      }
    };

    return recognition;
  }, [excelData, isListening, isProcessing]);

  const handleRecognitionError = (error: string) => {
    setIsProcessing(false);
    
    switch (error) {
      case 'no-speech':
        setTranscript('No se detectó voz. Intenta de nuevo.');
        break;
      case 'audio-capture':
        toast({
          title: "Error de micrófono",
          description: "No se puede acceder al micrófono",
          variant: "destructive",
        });
        forceStopRecognition();
        break;
      case 'not-allowed':
        toast({
          title: "Permisos denegados",
          description: "Permite el acceso al micrófono",
          variant: "destructive",
        });
        forceStopRecognition();
        break;
      case 'network':
        setTranscript('Error de conexión. Reintentando...');
        break;
      default:
        setTranscript(`Error: ${error}. Presiona iniciar para continuar.`);
    }
  };

  const forceStopRecognition = useCallback(() => {
    console.log('🛑 Forzando detención completa');
    
    // Detener reconocimiento actual
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (error) {
        console.log('Error deteniendo reconocimiento:', error);
      }
      recognitionRef.current = null;
    }
    
    // Resetear todos los estados
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setLastCommand('');
    
    toast({
      title: "🛑 Reconocimiento detenido",
      description: "Puedes volver a empezar cuando quieras",
    });
  }, []);

  const processVoiceCommand = useCallback((command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    console.log('🔍 Procesando comando:', command);
    
    // Buscar patrones de comandos más flexibles
    const lowerCommand = command.toLowerCase();
    
    // Patrones mejorados para búsqueda de productos
    const searchPatterns = [
      /(?:buscar?|encuentra?|localiza?|mostrar?)\s+(.+)/i,
      /(.+)\s+(?:stock|cantidad|inventario)/i,
      /^(.+)$/i // Cualquier texto como búsqueda
    ];
    
    let productQuery = '';
    for (const pattern of searchPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        productQuery = match[1].trim();
        break;
      }
    }
    
    if (productQuery) {
      searchProduct(productQuery);
    }
    
    // Patrones para actualización de stock
    const updatePatterns = [
      /(?:actualizar?|cambiar?|poner?|establecer?)\s+(.+?)\s+(?:a|con|en)\s+(\d+(?:\.\d+)?)/i,
      /(.+?)\s+(?:cantidad|stock|inventario)\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s+(.+)/i
    ];
    
    for (const pattern of updatePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const [, product, quantity] = match;
        updateProductStock(product.trim(), parseFloat(quantity));
        break;
      }
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  }, []);

  const searchProduct = (query: string) => {
    const results = excelData.filter(item => {
      const productName = (item.Producto || '').toLowerCase();
      const material = (item.Material || '').toLowerCase();
      const searchQuery = query.toLowerCase();
      
      return productName.includes(searchQuery) || 
             material.includes(searchQuery) ||
             searchQuery.split(' ').some(word => 
               productName.includes(word) || material.includes(word)
             );
    });

    if (results.length > 0) {
      const product = results[0];
      speak(`Encontré ${product.Producto}, stock actual: ${product.Stock} ${product.UMB}`);
      
      toast({
        title: `✅ Producto encontrado`,
        description: `${product.Producto} - Stock: ${product.Stock} ${product.UMB}`,
      });
    } else {
      speak(`No encontré el producto ${query}`);
      toast({
        title: "❌ Producto no encontrado",
        description: `No se encontró: ${query}`,
        variant: "destructive",
      });
    }
  };

  const updateProductStock = (productQuery: string, newStock: number) => {
    const productIndex = excelData.findIndex(item => {
      const productName = (item.Producto || '').toLowerCase();
      const material = (item.Material || '').toLowerCase();
      const query = productQuery.toLowerCase();
      
      return productName.includes(query) || 
             material.includes(query) ||
             query.split(' ').some(word => 
               productName.includes(word) || material.includes(word)
             );
    });

    if (productIndex !== -1) {
      const product = excelData[productIndex];
      onUpdateStock(productIndex, newStock);
      
      speak(`Stock actualizado: ${product.Producto} ahora tiene ${newStock} ${product.UMB}`);
      
      toast({
        title: "✅ Stock actualizado",
        description: `${product.Producto}: ${newStock} ${product.UMB}`,
      });
    } else {
      speak(`No pude actualizar el stock de ${productQuery}`);
      toast({
        title: "❌ No se pudo actualizar",
        description: `Producto no encontrado: ${productQuery}`,
        variant: "destructive",
      });
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

  const startListening = () => {
    if (excelData.length === 0) {
      toast({
        title: "No hay datos",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    const recognition = setupRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (error) {
        console.error('Error iniciando reconocimiento:', error);
        handleRecognitionError('start-error');
      }
    }
  };

  const stopListening = () => {
    forceStopRecognition();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Control principal */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={startListening}
            disabled={isListening}
            size="lg"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Mic className="w-5 h-5" />
            Iniciar Escucha
          </Button>
          
          <Button
            onClick={stopListening}
            disabled={!isListening}
            variant="destructive"
            size="lg"
            className="flex items-center gap-2"
          >
            <MicOff className="w-5 h-5" />
            Detener Escucha
          </Button>
        </div>

        {/* Estado visual */}
        {isListening && (
          <div className="flex items-center gap-2 text-green-600 animate-pulse">
            <Volume2 className="w-5 h-5" />
            <span className="font-medium">Escuchando...</span>
          </div>
        )}
      </div>

      {/* Transcripción en tiempo real */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">📝 Transcripción:</h3>
          <p className="text-sm bg-gray-50 p-3 rounded min-h-[60px]">
            {transcript || 'Presiona "Iniciar Escucha" para comenzar...'}
          </p>
          
          {lastCommand && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="font-medium text-blue-600 mb-1">🎯 Último comando:</h4>
              <p className="text-sm text-blue-800">{lastCommand}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ayuda de comandos */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">💡 Comandos disponibles:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <strong>🔍 Buscar productos:</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Buscar cerveza"</li>
                <li>• "Mostrar patatas"</li>
                <li>• Solo di el nombre del producto</li>
              </ul>
            </div>
            <div>
              <strong>📊 Actualizar stock:</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Cerveza 50"</li>
                <li>• "Actualizar patatas a 25"</li>
                <li>• "Poner aceite en 12"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 mb-2">📊 Estado del vocabulario:</h3>
          <div className="text-sm text-blue-600">
            <p>✅ Productos cargados: {excelData.length}</p>
            <p>📚 Palabras reconocibles: {processVocabulary().length}</p>
            <p>🎤 Reconocimiento: {isListening ? 'Activo' : 'Inactivo'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
