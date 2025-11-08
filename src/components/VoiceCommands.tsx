import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Volume2, Plus, List, Package, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWhisperRecognition } from "@/hooks/useWhisperRecognition";

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

interface MultipleProductUpdate {
  productQuery: string;
  quantity: number;
  suggestions: ProductSuggestion[];
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [pendingQuantity, setPendingQuantity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Estados para comandos múltiples
  const [showMultipleDialog, setShowMultipleDialog] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<MultipleProductUpdate[]>([]);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);
  const [skippedProducts, setSkippedProducts] = useState<{ productQuery: string; quantity: number }[]>([]);
  
  // Nuevo estado para el input de Superwhisper
  const [superwhisperText, setSuperwhisperText] = useState('');
  
  // Estado para elegir método de reconocimiento
  const [useWhisper, setUseWhisper] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Extraer vocabulario de productos para Whisper
  const productVocabulary = useMemo(() => {
    if (excelData.length === 0) return [];
    
    const vocab = new Set<string>();
    
    excelData.forEach(item => {
      // Añadir nombre completo del producto
      if (item.Producto) {
        vocab.add(item.Producto.toLowerCase().trim());
        
        // También añadir palabras individuales significativas (más de 3 caracteres)
        const words = item.Producto.toLowerCase()
          .replace(/[^\w\sáéíóúñü]/g, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length > 3);
        words.forEach((w: string) => vocab.add(w));
      }
    });
    
    const vocabArray = Array.from(vocab);
    console.log('📚 Vocabulario generado para Whisper:', vocabArray.length, 'términos');
    return vocabArray;
  }, [excelData]);

  // Hook de Whisper
  const whisperRecognition = useWhisperRecognition({
    onTranscript: (text) => {
      setTranscript(text);
      processVoiceCommand(text);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error de reconocimiento",
        description: error,
      });
    },
    vocabulary: productVocabulary
  });

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

  // Función CORREGIDA para convertir números en palabras a números
  const wordsToNumber = useCallback((text: string): string => {
    console.log('🔢 Entrada original:', text);
    
    const numberWords: { [key: string]: string } = {
      'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
      'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
      'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15',
      'dieciséis': '16', 'dieciseis': '16', 'diecisiete': '17', 'dieciocho': '18', 'diecinueve': '19',
      'veinte': '20', 'veintiuno': '21', 'veintidós': '22', 'veintidos': '22',
      'veintitrés': '23', 'veintitres': '23', 'veinticuatro': '24', 'veinticinco': '25',
      'veintiséis': '26', 'veintiseis': '26', 'veintisiete': '27', 'veintiocho': '28',
      'veintinueve': '29', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
      'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90',
      'cien': '100', 'doscientos': '200', 'trescientos': '300', 'cuatrocientos': '400',
      'quinientos': '500'
    };

    let result = text.toLowerCase();
    
    // Manejar números compuestos COMPLETOS primero
    const compoundPatterns = [
      // 90-99
      { pattern: /\bnoventa y nueve\b/g, value: '99' },
      { pattern: /\bnoventa y ocho\b/g, value: '98' },
      { pattern: /\bnoventa y siete\b/g, value: '97' },
      { pattern: /\bnoventa y seis\b/g, value: '96' },
      { pattern: /\bnoventa y cinco\b/g, value: '95' },
      { pattern: /\bnoventa y cuatro\b/g, value: '94' },
      { pattern: /\bnoventa y tres\b/g, value: '93' },
      { pattern: /\bnoventa y dos\b/g, value: '92' },
      { pattern: /\bnoventa y uno\b/g, value: '91' },
      
      // 80-89
      { pattern: /\bochenta y nueve\b/g, value: '89' },
      { pattern: /\bochenta y ocho\b/g, value: '88' },
      { pattern: /\bochenta y siete\b/g, value: '87' },
      { pattern: /\bochenta y seis\b/g, value: '86' },
      { pattern: /\bochenta y cinco\b/g, value: '85' },
      { pattern: /\bochenta y cuatro\b/g, value: '84' },
      { pattern: /\bochenta y tres\b/g, value: '83' },
      { pattern: /\bochenta y dos\b/g, value: '82' },
      { pattern: /\bochenta y uno\b/g, value: '81' },
      
      // 70-79
      { pattern: /\bsetenta y nueve\b/g, value: '79' },
      { pattern: /\bsetenta y ocho\b/g, value: '78' },
      { pattern: /\bsetenta y siete\b/g, value: '77' },
      { pattern: /\bsetenta y seis\b/g, value: '76' },
      { pattern: /\bsetenta y cinco\b/g, value: '75' },
      { pattern: /\bsetenta y cuatro\b/g, value: '74' },
      { pattern: /\bsetenta y tres\b/g, value: '73' },
      { pattern: /\bsetenta y dos\b/g, value: '72' },
      { pattern: /\bsetenta y uno\b/g, value: '71' },
      
      // 60-69
      { pattern: /\bsesenta y nueve\b/g, value: '69' },
      { pattern: /\bsesenta y ocho\b/g, value: '68' },
      { pattern: /\bsesenta y siete\b/g, value: '67' },
      { pattern: /\bsesenta y seis\b/g, value: '66' },
      { pattern: /\bsesenta y cinco\b/g, value: '65' },
      { pattern: /\bsesenta y cuatro\b/g, value: '64' },
      { pattern: /\bsesenta y tres\b/g, value: '63' },
      { pattern: /\bsesenta y dos\b/g, value: '62' },
      { pattern: /\bsesenta y uno\b/g, value: '61' },
      
      // 50-59
      { pattern: /\bcincuenta y nueve\b/g, value: '59' },
      { pattern: /\bcincuenta y ocho\b/g, value: '58' },
      { pattern: /\bcincuenta y siete\b/g, value: '57' },
      { pattern: /\bcincuenta y seis\b/g, value: '56' },
      { pattern: /\bcincuenta y cinco\b/g, value: '55' },
      { pattern: /\bcincuenta y cuatro\b/g, value: '54' },
      { pattern: /\bcincuenta y tres\b/g, value: '53' },
      { pattern: /\bcincuenta y dos\b/g, value: '52' },
      { pattern: /\bcincuenta y uno\b/g, value: '51' },
      
      // 40-49
      { pattern: /\bcuarenta y nueve\b/g, value: '49' },
      { pattern: /\bcuarenta y ocho\b/g, value: '48' },
      { pattern: /\bcuarenta y siete\b/g, value: '47' },
      { pattern: /\bcuarenta y seis\b/g, value: '46' },
      { pattern: /\bcuarenta y cinco\b/g, value: '45' },
      { pattern: /\bcuarenta y cuatro\b/g, value: '44' },
      { pattern: /\bcuarenta y tres\b/g, value: '43' },
      { pattern: /\bcuarenta y dos\b/g, value: '42' },
      { pattern: /\bcuarenta y uno\b/g, value: '41' },
      
      // 30-39
      { pattern: /\btreinta y nueve\b/g, value: '39' },
      { pattern: /\btreinta y ocho\b/g, value: '38' },
      { pattern: /\btreinta y siete\b/g, value: '37' },
      { pattern: /\btreinta y seis\b/g, value: '36' },
      { pattern: /\btreinta y cinco\b/g, value: '35' },
      { pattern: /\btreinta y cuatro\b/g, value: '34' },
      { pattern: /\btreinta y tres\b/g, value: '33' },
      { pattern: /\btreinta y dos\b/g, value: '32' },
      { pattern: /\btreinta y uno\b/g, value: '31' },
      
      // 100+
      { pattern: /\bciento cuarenta y cinco\b/g, value: '145' },
      { pattern: /\bciento cuarenta y cuatro\b/g, value: '144' },
      { pattern: /\bciento cuarenta y tres\b/g, value: '143' },
      { pattern: /\bciento cuarenta y dos\b/g, value: '142' },
      { pattern: /\bciento cuarenta y uno\b/g, value: '141' },
      { pattern: /\bciento cinco\b/g, value: '105' },
      { pattern: /\bciento cuatro\b/g, value: '104' },
      { pattern: /\bciento tres\b/g, value: '103' },
      { pattern: /\bciento dos\b/g, value: '102' },
      { pattern: /\bciento uno\b/g, value: '101' }
    ];
    
    // Aplicar patrones compuestos primero
    compoundPatterns.forEach(({ pattern, value }) => {
      result = result.replace(pattern, value);
    });
    
    // Luego números individuales
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
      .filter(item => item.similarity > 50) // Aumentado de 30 a 50 para mejorar la calidad
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log('📋 Sugerencias encontradas:', suggestions.length);
    return suggestions;
  };

  // FUNCIÓN ARREGLADA: showProductSuggestions
  const showProductSuggestions = (productQuery: string, quantity: number) => {
    console.log('🔍 Mostrando sugerencias para:', productQuery, 'cantidad:', quantity);
    
    const suggestions = findProductSuggestions(productQuery);
    
    if (suggestions.length === 0) {
      toast({
        title: "❌ Producto no encontrado",
        description: `No se encontró "${productQuery}"`,
        variant: "destructive",
      });
      return;
    }
    
    setSuggestions(suggestions.slice(0, 5));
    setPendingQuantity(quantity);
    setSearchQuery(productQuery);
    setShowSuggestionsDialog(true);
  };

  // FUNCIÓN COMPLETAMENTE REESCRITA: parseMultipleCommands - NUEVA ESTRATEGIA
  const parseMultipleCommands = (command: string): { productQuery: string; quantity: number }[] => {
    console.log('🔄 NUEVO PARSER - Comando original:', command);
    
    // Convertir números en palabras primero
    const commandWithNumbers = wordsToNumber(command);
    console.log('🔢 Con números convertidos:', commandWithNumbers);
    
    const parsedCommands: { productQuery: string; quantity: number }[] = [];
    
    // NUEVA ESTRATEGIA: Buscar todos los números en el texto
    const numberMatches = Array.from(commandWithNumbers.matchAll(/\b(\d+(?:\.\d+)?)\b/g));
    console.log('🔍 Números encontrados:', numberMatches.map(m => m[1]));
    
    if (numberMatches.length <= 1) {
      console.log('❌ Solo hay un número o ninguno, no es comando múltiple');
      return [];
    }
    
    // Si hay múltiples números, intentar dividir el texto por cada número
    let remainingText = commandWithNumbers.toLowerCase();
    
    numberMatches.forEach((match, index) => {
      const number = parseFloat(match[1]);
      const numberPosition = match.index!;
      
      if (index === 0) {
        // Para el primer número, el producto va desde el inicio hasta el número
        const productText = remainingText.substring(0, numberPosition).trim();
        if (productText.length >= 3) {
          parsedCommands.push({
            productQuery: productText,
            quantity: number
          });
          console.log(`✅ Comando ${index + 1}: "${productText}" -> ${number}`);
        }
      } else {
        // Para números siguientes, el producto va desde el número anterior hasta este número
        const prevMatch = numberMatches[index - 1];
        const prevNumberEnd = prevMatch.index! + prevMatch[0].length;
        const productText = remainingText.substring(prevNumberEnd, numberPosition).trim();
        
        if (productText.length >= 3) {
          parsedCommands.push({
            productQuery: productText,
            quantity: number
          });
          console.log(`✅ Comando ${index + 1}: "${productText}" -> ${number}`);
        }
      }
      
      // Si es el último número, ver si hay texto después
      if (index === numberMatches.length - 1) {
        const textAfter = remainingText.substring(numberPosition + match[0].length).trim();
        if (textAfter.length >= 3) {
          // Si hay texto después del último número, podría ser otro producto sin cantidad
          console.log('⚠️ Texto después del último número:', textAfter, '- podría ser producto sin cantidad');
        }
      }
    });
    
    console.log('📋 RESULTADO PARSER MEJORADO:', parsedCommands.length, 'comandos:', parsedCommands);
    return parsedCommands;
  };

  // FUNCIÓN MEJORADA: detectar comandos múltiples
  const isMultipleProductCommand = (command: string): boolean => {
    const commandWithNumbers = wordsToNumber(command);
    
    // Contar números en el comando
    const numberMatches = commandWithNumbers.match(/\b\d+(?:\.\d+)?\b/g);
    const numberCount = numberMatches ? numberMatches.length : 0;
    
    console.log('🔍 Detectando múltiples productos - Números encontrados:', numberCount, numberMatches);
    
    // Si hay 2 o más números, probablemente es comando múltiple
    if (numberCount >= 2) {
      console.log('✅ Detectado como comando múltiple por múltiples números');
      return true;
    }
    
    // También buscar separadores tradicionales
    const multipleIndicators = [
      /,\s*y\s+/i,
      /,\s+\w/i,
      /\s+y\s+\w+\s+\d+/i,
      /\s+también\s+/i,
      /;\s*/i
    ];
    
    const hasTraditionalSeparators = multipleIndicators.some(indicator => indicator.test(command));
    
    if (hasTraditionalSeparators) {
      console.log('✅ Detectado como comando múltiple por separadores tradicionales');
      return true;
    }
    
    console.log('❌ No detectado como comando múltiple');
    return false;
  };

  // FUNCIÓN COMPLETAMENTE REESCRITA: processMultipleCommands
  const processMultipleCommands = (commands: { productQuery: string; quantity: number }[]) => {
    console.log('🎭 INICIO: Procesando comandos múltiples:', commands.length, commands);
    
    if (commands.length === 0) {
      toast({
        title: "❌ Error de procesamiento",
        description: "No se pudieron procesar los comandos múltiples",
        variant: "destructive",
      });
      return;
    }
    
    // Separar productos con y sin sugerencias
    const validUpdates: MultipleProductUpdate[] = [];
    const skippedProducts: { productQuery: string; quantity: number }[] = [];
    
    commands.forEach(({ productQuery, quantity }, commandIndex) => {
      console.log(`🔍 [Comando ${commandIndex + 1}] Buscando: "${productQuery}" cantidad: ${quantity}`);
      const suggestions = findProductSuggestions(productQuery);
      console.log(`📋 [Comando ${commandIndex + 1}] Encontradas ${suggestions.length} sugerencias`);
      
      if (suggestions.length > 0) {
        validUpdates.push({
          productQuery,
          quantity,
          suggestions: suggestions.slice(0, 5)
        });
      } else {
        skippedProducts.push({ productQuery, quantity });
        console.log(`⏭️ [Comando ${commandIndex + 1}] "${productQuery}" saltado por falta de coincidencias`);
      }
    });
    
    console.log('✅ PREPARADO: Válidos:', validUpdates.length, 'Saltados:', skippedProducts.length);
    
    // Mostrar información de productos saltados
    if (skippedProducts.length > 0) {
      const skippedList = skippedProducts.map(p => `"${p.productQuery}"`).join(', ');
      toast({
        title: "⚠️ Productos saltados",
        description: `Se saltaron ${skippedProducts.length} productos sin coincidencias: ${skippedList}`,
        variant: "destructive",
      });
    }
    
    // Configurar estado para mostrar diálogo múltiple
    setPendingUpdates(validUpdates);
    setSkippedProducts(skippedProducts);
    setCurrentUpdateIndex(0);
    setShowMultipleDialog(true);
    
    console.log('🎯 RESULTADO: Mostrando diálogo múltiple con', validUpdates.length, 'productos válidos');
  };

  // Función para añadir stock a un producto
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
    
    console.log(`✅ Stock actualizado: ${product.Producto} +${quantityToAdd}`);
    
    // Toast de confirmación
    toast({
      title: "✅ Stock actualizado",
      description: `${product.Producto}: +${quantityToAdd} unidades`,
    });
  };

  // Función para manejar la selección de una sugerencia
  const handleSuggestionSelect = (suggestion: ProductSuggestion) => {
    console.log('🎯 Seleccionando sugerencia:', suggestion.product.Producto);
    addStockToProduct(suggestion.index, pendingQuantity);
    setShowSuggestionsDialog(false);
    setSuggestions([]);
    setPendingQuantity(0);
    setSearchQuery('');
  };

  // Función para reintentar productos saltados
  const retrySkippedProducts = () => {
    if (skippedProducts.length === 0) return;
    
    console.log('🔄 Reintentando productos saltados:', skippedProducts);
    
    // Procesar productos saltados uno por uno como comandos simples
    skippedProducts.forEach(({ productQuery, quantity }) => {
      console.log(`🔄 Reintentando: "${productQuery}" cantidad: ${quantity}`);
      showProductSuggestions(productQuery, quantity);
    });
    
    // Limpiar productos saltados
    setSkippedProducts([]);
  };

  // FUNCIÓN MEJORADA: handleMultipleSuggestionSelect
  const handleMultipleSuggestionSelect = (suggestion: ProductSuggestion) => {
    const currentUpdate = pendingUpdates[currentUpdateIndex];
    
    console.log(`🎯 [${currentUpdateIndex + 1}/${pendingUpdates.length}] Selección múltiple:`, {
      producto: suggestion.product.Producto,
      cantidad: currentUpdate.quantity,
      índice: suggestion.index
    });
    
    // ACTUALIZAR EL STOCK INMEDIATAMENTE
    addStockToProduct(suggestion.index, currentUpdate.quantity);
    
    // Pasar al siguiente producto
    const nextIndex = currentUpdateIndex + 1;
    console.log(`🔄 Pasando al siguiente: ${nextIndex} de ${pendingUpdates.length}`);
    
    if (nextIndex < pendingUpdates.length) {
      setCurrentUpdateIndex(nextIndex);
      console.log(`➡️ Mostrando producto ${nextIndex + 1}: ${pendingUpdates[nextIndex].productQuery}`);
    } else {
      // Terminar proceso múltiple
      console.log('🎉 TERMINADO: Todos los productos válidos procesados');
      setShowMultipleDialog(false);
      setPendingUpdates([]);
      setCurrentUpdateIndex(0);
      
      const processedCount = pendingUpdates.length;
      const skippedCount = skippedProducts.length;
      
      if (skippedCount > 0) {
        toast({
          title: "✅ Productos válidos procesados",
          description: `Se actualizaron ${processedCount} productos. ${skippedCount} productos saltados disponibles para reintento.`,
        });
        
        // Ofrecer reintento después de un pequeño delay
        setTimeout(() => {
          if (skippedProducts.length > 0) {
            toast({
              title: "🔄 ¿Reintentar productos saltados?",
              description: `Quedan ${skippedProducts.length} productos por procesar. Usa comandos individuales para cada uno.`,
            });
          }
        }, 2000);
      } else {
        toast({
          title: "🎉 Actualización múltiple completada",
          description: `Se actualizaron ${processedCount} productos`,
        });
      }
    }
  };

  // FUNCIÓN CORREGIDA: processVoiceCommand
  const processVoiceCommand = useCallback((command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    console.log('🔍 PROCESANDO COMANDO:', command);
    
    // NUEVA DETECCIÓN de comandos múltiples
    const isMultiple = isMultipleProductCommand(command);
    console.log('🎭 ¿Es comando múltiple?', isMultiple);
    
    if (isMultiple) {
      console.log('🎭 Procesando como comando múltiple');
      const commands = parseMultipleCommands(command);
      
      if (commands.length > 1) {
        console.log('✅ Múltiples comandos parseados correctamente:', commands.length);
        processMultipleCommands(commands);
        setTimeout(() => setIsProcessing(false), 1000);
        return;
      } else if (commands.length === 1) {
        console.log('🔄 Solo un comando parseado, procesando como simple');
        const { productQuery, quantity } = commands[0];
        showProductSuggestions(productQuery, quantity);
        setTimeout(() => setIsProcessing(false), 1000);
        return;
      } else {
        console.log('❌ No se pudieron parsear comandos múltiples, intentando como simple');
      }
    }
    
    // Procesar comando simple (código existente)
    console.log('🎯 Procesando como comando simple');
    const commandWithNumbers = wordsToNumber(command);
    console.log('🔄 Comando con números convertidos:', commandWithNumbers);
    
    const lowerCommand = commandWithNumbers.toLowerCase().trim();
    
    const updatePatterns = [
      /^(.+?)\s+(\d+(?:\.\d+)?)$/i,
      /^(?:añadir?|agregar?|sumar?)\s+(.+?)\s+(\d+(?:\.\d+)?)$/i,
      /^(?:actualizar?|cambiar?|poner?)\s+(.+?)\s+(?:a|con|en)\s+(\d+(?:\.\d+)?)$/i,
    ];
    
    let commandProcessed = false;
    
    for (const pattern of updatePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const productQuery = match[1].trim();
        const quantity = parseFloat(match[2]);
        
        console.log('🎯 Comando simple detectado:', { productQuery, quantity });
        
        if (!isNaN(quantity) && quantity > 0) {
          showProductSuggestions(productQuery, quantity);
          commandProcessed = true;
          break;
        }
      }
    }
    
    if (!commandProcessed) {
      console.log('❌ Comando no procesado:', command);
      toast({
        title: "❌ Comando no reconocido",
        description: "Intenta: 'producto cantidad' o 'producto1 cantidad1 producto2 cantidad2'",
        variant: "destructive",
      });
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  }, [excelData, onUpdateStock, wordsToNumber, toast]);

  // Nueva función para procesar texto de Superwhisper
  const processSuperwhisperText = () => {
    if (!superwhisperText.trim()) {
      toast({
        title: "❌ Texto vacío",
        description: "Pega el texto reconocido por Superwhisper primero",
        variant: "destructive",
      });
      return;
    }

    console.log('📝 Procesando texto de Superwhisper:', superwhisperText);
    
    // Usar la misma lógica que el reconocimiento de voz
    processVoiceCommand(superwhisperText.trim());
    
    // Limpiar el input después del procesamiento
    setSuperwhisperText('');
  };

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

    if (useWhisper) {
      // Usar Whisper
      whisperRecognition.startRecording();
      setIsListening(true);
      setTranscript('');
      console.log('✅ Grabación iniciada con Whisper');
    } else {
      // Usar Web Speech API (método original)
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
    }
  };

  // Función para detener la escucha
  const stopListening = () => {
    if (useWhisper) {
      whisperRecognition.stopRecording();
      setIsListening(false);
    } else {
      forceStopRecognition();
    }
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
        {/* Selector de método de reconocimiento */}
        <Card className="w-full max-w-md bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label htmlFor="whisper-mode" className="text-base font-semibold">
                    Whisper AI
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {useWhisper ? 'Reconocimiento mejorado con IA' : 'Reconocimiento estándar'}
                  </p>
                </div>
              </div>
              <Switch
                id="whisper-mode"
                checked={useWhisper}
                onCheckedChange={setUseWhisper}
                disabled={isListening}
              />
            </div>
            {useWhisper && whisperRecognition.isLoading && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 animate-pulse">
                ⏳ Cargando modelo (~40MB, solo primera vez)...
              </p>
            )}
            {useWhisper && !whisperRecognition.isLoading && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✅ Modelo cargado y listo
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={startListening}
            disabled={isListening || (useWhisper && whisperRecognition.isLoading)}
            size="lg"
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Mic className="w-5 h-5" />
            {useWhisper ? 'Grabar con Whisper' : 'Iniciar Escucha'}
          </Button>
          
          <Button
            onClick={stopListening}
            disabled={!isListening}
            variant="destructive"
            size="lg"
            className="flex items-center gap-2"
          >
            <MicOff className="w-5 h-5" />
            {useWhisper ? 'Detener Grabación' : 'Detener Escucha'}
          </Button>
        </div>

        {/* Estado visual */}
        {isListening && (
          <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
            <Volume2 className="w-5 h-5" />
            <span className="font-medium">
              {useWhisper ? 'Grabando con Whisper...' : 'Escuchando...'}
            </span>
          </div>
        )}

        {/* NUEVO: Input para Superwhisper - Colocado justo después de los botones */}
        <div className="mt-8 p-6 bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Superwhisper - Pegar texto</h3>
          </div>
          
          <div className="space-y-3">
            <Textarea
              value={superwhisperText}
              onChange={(e) => setSuperwhisperText(e.target.value)}
              placeholder="Pega aquí el texto reconocido por Superwhisper (ej: 3 coca colas, 2 cervezas, 1 paquete arroz)"
              className="w-full rounded-xl border border-border bg-background p-3 min-h-[100px] resize-none text-foreground placeholder:text-muted-foreground"
              rows={4}
            />
            
            <Button
              onClick={processSuperwhisperText}
              disabled={!superwhisperText.trim() || isProcessing}
              className="w-full apple-button bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <FileText className="w-4 h-4 mr-2" />
              Procesar texto
            </Button>
          </div>
        </div>
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

      {/* Diálogo para comandos simples (existente) */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🔍 Selecciona el producto correcto</DialogTitle>
            <DialogDescription>
              Encontramos {suggestions.length} productos similares a "{searchQuery}". 
              Selecciona el correcto para añadir {pendingQuantity} unidades.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors hover:border-green-400"
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
                  
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
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

      {/* NUEVO Diálogo para comandos múltiples */}
      <Dialog open={showMultipleDialog} onOpenChange={setShowMultipleDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              🎯 Actualización Múltiple - Paso {currentUpdateIndex + 1} de {pendingUpdates.length}
            </DialogTitle>
            <DialogDescription>
              {pendingUpdates.length > 0 && (
                <>
                  Selecciona el producto correcto para "{pendingUpdates[currentUpdateIndex]?.productQuery}" 
                  y añadir {pendingUpdates[currentUpdateIndex]?.quantity} unidades.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {pendingUpdates.length > 0 && (
            <div className="space-y-4">
              {/* Progreso visual */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentUpdateIndex) / pendingUpdates.length) * 100}%` }}
                  />
                </div>
                <span>{currentUpdateIndex} / {pendingUpdates.length}</span>
              </div>
              
              {/* Lista de todos los productos pendientes */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2">📋 Productos a actualizar:</h4>
                <div className="space-y-1 text-sm">
                  {pendingUpdates.map((update, index) => (
                    <div 
                      key={index} 
                      className={`flex justify-between ${
                        index === currentUpdateIndex 
                          ? 'font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded' 
                          : index < currentUpdateIndex 
                            ? 'text-green-600 line-through' 
                            : 'text-gray-600'
                      }`}
                    >
                      <span>{update.productQuery}</span>
                      <span>+{update.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Productos saltados */}
              {skippedProducts.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-700 mb-2">⚠️ Productos saltados ({skippedProducts.length}):</h4>
                  <div className="space-y-1 text-sm">
                    {skippedProducts.map((skipped, index) => (
                      <div key={index} className="flex justify-between text-yellow-600">
                        <span>"{skipped.productQuery}"</span>
                        <span>+{skipped.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    Estos productos se procesarán individualmente después de completar los válidos.
                  </p>
                </div>
              )}
              
              {/* Sugerencias para el producto actual */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h4 className="font-medium">Selecciona el producto correcto:</h4>
                {pendingUpdates[currentUpdateIndex]?.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors hover:border-green-400"
                    onClick={() => handleMultipleSuggestionSelect(suggestion)}
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
                      
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                        <Plus className="w-5 h-5" />
                        <span className="font-bold text-lg">{pendingUpdates[currentUpdateIndex]?.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMultipleDialog(false);
                setPendingUpdates([]);
                setCurrentUpdateIndex(0);
                setSkippedProducts([]);
              }}
            >
              Cancelar Todo
            </Button>
            
            {currentUpdateIndex > 0 && (
              <Button 
                variant="outline"
                onClick={() => setCurrentUpdateIndex(currentUpdateIndex - 1)}
              >
                ← Anterior
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Información del sistema */}
      <div className="apple-card p-6 mt-6 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-medium text-foreground">Estado del sistema</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-medium text-foreground">{excelData.length}</p>
            <p className="text-muted-foreground text-xs">Productos</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">{isListening ? 'Activo' : 'Inactivo'}</p>
            <p className="text-muted-foreground text-xs">Reconocimiento</p>
          </div>
          <div className="text-center col-span-2 md:col-span-1">
            <p className="font-medium text-foreground">Suma</p>
            <p className="text-muted-foreground text-xs">Modo stock</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommands;
