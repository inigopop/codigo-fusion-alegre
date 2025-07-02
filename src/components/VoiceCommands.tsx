import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Volume2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (index: number, stockToAdd: number) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

interface ProductSuggestion {
  product: any;
  index: number;
  similarity: number;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [pendingQuantity, setPendingQuantity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Función para normalizar texto (quitar acentos y convertir a minúsculas)
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .trim();
  }, []);

  // Función para convertir números en palabras a números
  const wordsToNumber = useCallback((text: string): string => {
    const numberWords: { [key: string]: string } = {
      'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
      'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
      'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15',
      'dieciséis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19',
      'veinte': '20', 'veintiuno': '21', 'veintidós': '22', 'veintitrés': '23',
      'veinticuatro': '24', 'veinticinco': '25', 'veintiséis': '26', 'veintisiete': '27',
      'veintiocho': '28', 'veintinueve': '29', 'treinta': '30', 'cuarenta': '40',
      'cincuenta': '50', 'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90',
      'cien': '100', 'doscientos': '200', 'trescientos': '300', 'cuatrocientos': '400',
      'quinientos': '500'
    };

    let result = text.toLowerCase();
    
    // Manejar casos especiales como "treinta y cuatro"
    result = result.replace(/treinta y cuatro/g, '34');
    result = result.replace(/treinta y cinco/g, '35');
    result = result.replace(/treinta y seis/g, '36');
    result = result.replace(/treinta y siete/g, '37');
    result = result.replace(/treinta y ocho/g, '38');
    result = result.replace(/treinta y nueve/g, '39');
    result = result.replace(/cuarenta y cinco/g, '45');
    result = result.replace(/cincuenta y cinco/g, '55');
    
    // Reemplazar números individuales
    Object.entries(numberWords).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, number);
    });
    
    console.log('🔢 Conversión números:', text, '->', result);
    return result;
  }, []);

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

  // Función para calcular similitud entre strings (MEJORADA con normalización)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    
    console.log('🔍 Comparando:', str1, '→', s1, 'vs', str2, '→', s2);
    
    // Coincidencia exacta
    if (s1 === s2) return 100;
    
    // Contiene la búsqueda completa
    if (s2.includes(s1) || s1.includes(s2)) return 90;
    
    // Coincidencia por palabras individuales (mejorada)
    const words1 = s1.split(/\s+/).filter(w => w.length > 2);
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);
    
    let matchingWords = 0;
    let totalSimilarity = 0;
    
    words1.forEach(word1 => {
      let bestMatch = 0;
      words2.forEach(word2 => {
        // Coincidencia exacta de palabra
        if (word1 === word2) {
          bestMatch = Math.max(bestMatch, 100);
        }
        // Una palabra contiene la otra
        else if (word2.includes(word1) || word1.includes(word2)) {
          bestMatch = Math.max(bestMatch, 80);
        }
        // Similitud por caracteres (para palabras cortas)
        else if (word1.length >= 3 && word2.length >= 3) {
          const commonChars = [...word1].filter(char => word2.includes(char)).length;
          const similarity = (commonChars / Math.max(word1.length, word2.length)) * 60;
          bestMatch = Math.max(bestMatch, similarity);
        }
      });
      
      if (bestMatch > 40) {
        matchingWords++;
        totalSimilarity += bestMatch;
      }
    });
    
    if (matchingWords === 0) return 0;
    
    const avgSimilarity = totalSimilarity / matchingWords;
    const wordRatio = matchingWords / Math.max(words1.length, words2.length);
    
    const finalScore = avgSimilarity * wordRatio;
    console.log('📊 Similitud calculada:', finalScore.toFixed(1), '%');
    
    return finalScore;
  };

  // Función para buscar sugerencias de productos
  const findProductSuggestions = (query: string): ProductSuggestion[] => {
    console.log('🔍 Buscando sugerencias para:', query);
    
    const suggestions = excelData
      .map((product, index) => {
        const productName = (product.Producto || '').toString();
        const materialCode = (product.Material || product.Codigo || '').toString();
        
        const nameSimilarity = calculateSimilarity(query, productName);
        const codeSimilarity = calculateSimilarity(query, materialCode);
        const maxSimilarity = Math.max(nameSimilarity, codeSimilarity);
        
        return {
          product,
          index,
          similarity: maxSimilarity
        };
      })
      .filter(item => item.similarity > 30)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    console.log('📋 Sugerencias encontradas:', suggestions.length);
    return suggestions;
  };

  // Función para buscar producto exacto (MEJORADA)
  const findExactProductMatch = (query: string): number => {
    console.log('🎯 Buscando coincidencia exacta para:', query);
    
    return excelData.findIndex(product => {
      const productName = (product.Producto || '').toString();
      const materialCode = (product.Material || product.Codigo || '').toString();
      
      const nameSimilarity = calculateSimilarity(query, productName);
      const codeSimilarity = calculateSimilarity(query, materialCode);
      
      console.log('🔍 Producto:', productName, '| Similitud nombre:', nameSimilarity.toFixed(1), '| Similitud código:', codeSimilarity.toFixed(1));
      
      // Lowered threshold for exact match to be more permissive
      return nameSimilarity > 60 || codeSimilarity > 60;
    });
  };

  // Función para mostrar sugerencias de productos (sin notificación de voz)
  const showProductSuggestions = (query: string, quantity: number) => {
    console.log('🎭 Mostrando sugerencias para:', query, 'cantidad:', quantity);
    
    const productSuggestions = findProductSuggestions(query);
    
    if (productSuggestions.length > 0) {
      setSuggestions(productSuggestions);
      setPendingQuantity(quantity);
      setSearchQuery(query);
      setShowSuggestionsDialog(true);
    } else {
      toast({
        title: "❌ Producto no encontrado",
        description: `No se encontraron coincidencias para: ${query}`,
        variant: "destructive",
      });
    }
  };

  // Función para añadir stock a un producto (sin notificaciones)
  const addStockToProduct = (productIndex: number, quantityToAdd: number) => {
    const product = excelData[productIndex];
    console.log('➕ SUMANDO stock:', {
      producto: product.Producto,
      stockActual: product.Stock,
      cantidadASumar: quantityToAdd,
      nuevoStock: (Number(product.Stock) || 0) + quantityToAdd
    });
    
    // Llamar a la función con la cantidad a SUMAR (no reemplazar)
    onUpdateStock(productIndex, quantityToAdd);
    
    // Solo log, sin notificaciones
    console.log(`✅ Stock actualizado: ${product.Producto} +${quantityToAdd}`);
  };

  // Función para manejar la selección de una sugerencia
  const handleSuggestionSelect = (suggestion: ProductSuggestion) => {
    addStockToProduct(suggestion.index, pendingQuantity);
    setShowSuggestionsDialog(false);
    setSuggestions([]);
    setPendingQuantity(0);
    setSearchQuery('');
  };

  // Función para procesar el comando de voz
  const processVoiceCommand = useCallback((command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    console.log('🔍 Procesando comando:', command);
    
    // Convertir números en palabras a números primero
    const commandWithNumbers = wordsToNumber(command);
    console.log('🔄 Comando con números convertidos:', commandWithNumbers);
    
    const lowerCommand = commandWithNumbers.toLowerCase().trim();
    
    // Patrones mejorados para detectar comandos
    const updatePatterns = [
      /(.+?)\s+(\d+(?:\.\d+)?)\s*$/i,  // "vino emina 12"
      /(?:añadir?|agregar?|sumar?)\s+(.+?)\s+(\d+(?:\.\d+)?)/i,  // "añadir vino emina 12"
      /(?:actualizar?|cambiar?|poner?)\s+(.+?)\s+(?:a|con|en)\s+(\d+(?:\.\d+)?)/i,
    ];
    
    let commandProcessed = false;
    
    for (const pattern of updatePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const productQuery = match[1].trim();
        const quantity = parseFloat(match[2]);
        
        console.log('🎯 Comando de actualización detectado:', { productQuery, quantity });
        
        if (!isNaN(quantity) && quantity >= 0) {
          // Buscar producto exacto primero
          const exactMatch = findExactProductMatch(productQuery);
          
          if (exactMatch !== -1) {
            // Encontrado exacto - añadir cantidad
            console.log('✅ Producto encontrado exacto en índice:', exactMatch);
            addStockToProduct(exactMatch, quantity);
            commandProcessed = true;
          } else {
            // No encontrado exacto - mostrar sugerencias
            console.log('❓ Producto no encontrado exacto, mostrando sugerencias');
            showProductSuggestions(productQuery, quantity);
            commandProcessed = true;
          }
          break;
        }
      }
    }
    
    if (!commandProcessed) {
      console.log('❌ Comando no procesado');
      toast({
        title: "❌ Comando no reconocido",
        description: "Intenta decir: 'nombre del producto cantidad'",
        variant: "destructive",
      });
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  }, [excelData, onUpdateStock, wordsToNumber]);

  // Función para forzar la detención del reconocimiento
  const forceStopRecognition = useCallback(() => {
    console.log('🛑 Forzando detención completa');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (error) {
        console.log('Error deteniendo reconocimiento:', error);
      }
      recognitionRef.current = null;
    }
    
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setLastCommand('');
    
    toast({
      title: "🛑 Reconocimiento detenido",
      description: "Puedes volver a empezar cuando quieras",
    });
  }, []);

  // Función para manejar el error de reconocimiento
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

  // Función para configurar el reconocimiento
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
  }, [excelData, isListening, isProcessing, processVoiceCommand, handleRecognitionError]);

  // Función para iniciar la escucha
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

  // Función para detener la escucha
  const stopListening = () => {
    forceStopRecognition();
  };

  // Efecto para limpiar el reconocimiento al desmontar el componente
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
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
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
          <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
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

      {/* Diálogo de sugerencias */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Productos similares a "{searchQuery}"</DialogTitle>
            <DialogDescription>
              Selecciona el producto correcto para añadir {pendingQuantity} unidades
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-lg">{suggestion.product.Producto}</p>
                    <p className="text-sm text-gray-600">
                      Código: {suggestion.product.Material || suggestion.product.Codigo} | 
                      Stock actual: {suggestion.product.Stock || 0} {suggestion.product.UMB}
                    </p>
                    <p className="text-xs text-green-600">
                      Similitud: {Math.round(suggestion.similarity)}%
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-green-600">
                    <Plus className="w-5 h-5" />
                    <span className="font-bold text-lg">{pendingQuantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowSuggestionsDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ayuda de comandos */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">💡 Comandos disponibles:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <strong>➕ Añadir stock (SUMATORIO):</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Vino Emina doce" (suma 12)</li>
                <li>• "Cerveza seis" (suma 6)</li>
                <li>• "Azúcar treinta y cuatro"</li>
                <li>• "Añadir patatas veinticinco"</li>
              </ul>
            </div>
            <div>
              <strong>🔍 Si no encuentra exacto:</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• Se abrirá un diálogo</li>
                <li>• Mostrará productos similares</li>
                <li>• Selecciona el correcto</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 mb-2">📊 Sistema de Stock Sumatorio:</h3>
          <div className="text-sm text-blue-600 space-y-1">
            <p>✅ Productos cargados: {excelData.length}</p>
            <p>➕ Modo: SUMA cantidades al stock existente</p>
            <p>🎤 Reconocimiento: {isListening ? 'Activo' : 'Inactivo'}</p>
            <p>🔢 Reconoce números en palabras (doce, treinta y cuatro, etc.)</p>
            <p>🔍 Búsqueda inteligente con sugerencias automáticas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
