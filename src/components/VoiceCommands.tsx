import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Volume2, Plus, List } from "lucide-react";
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
      .filter(item => item.similarity > 30)
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

  // FUNCIÓN COMPLETAMENTE REESCRITA: parseMultipleCommands
  const parseMultipleCommands = (command: string): { productQuery: string; quantity: number }[] => {
    console.log('🔄 Parseando comando múltiple ORIGINAL:', command);
    
    // Convertir números en palabras primero
    const commandWithNumbers = wordsToNumber(command);
    console.log('🔢 Con números convertidos:', commandWithNumbers);
    
    const parsedCommands: { productQuery: string; quantity: number }[] = [];
    
    // NUEVA ESTRATEGIA: Buscar patrones producto + número de forma secuencial
    let remainingText = commandWithNumbers.toLowerCase().trim();
    
    // Patrón para detectar: texto + número (donde texto no contiene números)
    const productNumberPattern = /^(.*?)(\d+(?:\.\d+)?)\s*(.*)$/;
    
    while (remainingText.length > 0) {
      console.log('🔍 Procesando texto restante:', remainingText);
      
      const match = remainingText.match(productNumberPattern);
      if (!match) {
        console.log('❌ No se encontró patrón válido en:', remainingText);
        break;
      }
      
      const [, productPart, quantityStr, afterPart] = match;
      const quantity = parseFloat(quantityStr);
      
      if (isNaN(quantity) || quantity <= 0) {
        console.log('❌ Cantidad inválida:', quantityStr);
        break;
      }
      
      // Limpiar el nombre del producto (quitar palabras de separación al final)
      let productName = productPart.trim();
      
      // Remover palabras de separación comunes al final del producto
      const separatorWords = ['y', 'también', 'tambien', ','];
      const productWords = productName.split(/\s+/);
      
      // Si la última palabra es un separador, removerla
      if (productWords.length > 1 && separatorWords.includes(productWords[productWords.length - 1])) {
        productWords.pop();
        productName = productWords.join(' ');
      }
      
      if (productName.length >= 3) {
        parsedCommands.push({
          productQuery: productName,
          quantity: quantity
        });
        console.log(`✅ Comando parseado: "${productName}" -> ${quantity}`);
      }
      
      // Preparar para la siguiente iteración
      remainingText = afterPart.trim();
      
      // Limpiar separadores al inicio del texto restante
      remainingText = remainingText.replace(/^(y\s+|también\s+|tambien\s+|,\s*)+/i, '').trim();
      
      // Prevenir bucles infinitos
      if (remainingText === productPart.trim() + quantityStr) {
        console.log('🛑 Detectado bucle infinito, deteniendo');
        break;
      }
    }
    
    console.log('📋 RESULTADO FINAL - Total comandos parseados:', parsedCommands.length, parsedCommands);
    return parsedCommands;
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
    
    // Preparar todas las actualizaciones con sus sugerencias
    const updates: MultipleProductUpdate[] = [];
    
    commands.forEach(({ productQuery, quantity }, commandIndex) => {
      console.log(`🔍 [Comando ${commandIndex + 1}] Buscando: "${productQuery}" cantidad: ${quantity}`);
      const suggestions = findProductSuggestions(productQuery);
      console.log(`📋 [Comando ${commandIndex + 1}] Encontradas ${suggestions.length} sugerencias`);
      
      updates.push({
        productQuery,
        quantity,
        suggestions: suggestions.slice(0, 5)
      });
    });
    
    console.log('✅ PREPARADO: Total actualizaciones preparadas:', updates.length);
    
    // Configurar estado para mostrar diálogo múltiple
    setPendingUpdates(updates);
    setCurrentUpdateIndex(0);
    setShowMultipleDialog(true);
    
    console.log('🎯 RESULTADO: Mostrando diálogo múltiple con', updates.length, 'productos');
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
      console.log('🎉 TERMINADO: Todos los productos procesados');
      setShowMultipleDialog(false);
      setPendingUpdates([]);
      setCurrentUpdateIndex(0);
      
      toast({
        title: "🎉 Actualización múltiple completada",
        description: `Se actualizaron ${pendingUpdates.length} productos`,
      });
    }
  };

  // FUNCIÓN CORREGIDA: processVoiceCommand
  const processVoiceCommand = useCallback((command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    console.log('🔍 Procesando comando completo:', command);
    
    // Detectar si es comando múltiple con separadores más específicos
    const multipleIndicators = [
      /,\s*y\s+/i,              // ", y "
      /,\s+\w/i,                // ", palabra"
      /\s+y\s+\w+\s+\d+/i,      // " y producto número"
      /\s+también\s+/i,         // " también "
      /;\s*/i                   // ";"
    ];
    
    const hasMultipleProducts = multipleIndicators.some(indicator => indicator.test(command));
    
    console.log('🎭 ¿Es comando múltiple?', hasMultipleProducts);
    
    if (hasMultipleProducts) {
      console.log('🎭 Procesando como comando múltiple');
      const commands = parseMultipleCommands(command);
      
      if (commands.length > 1) {
        processMultipleCommands(commands);
        setTimeout(() => setIsProcessing(false), 1000);
        return;
      } else if (commands.length === 1) {
        // Si solo se parseó un comando, procesarlo como simple
        console.log('🔄 Solo un comando parseado, procesando como simple');
        const { productQuery, quantity } = commands[0];
        showProductSuggestions(productQuery, quantity);
        setTimeout(() => setIsProcessing(false), 1000);
        return;
      }
    }
    
    // Procesar comando simple
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
        description: "Intenta: 'producto cantidad' o 'producto1 cantidad1, producto2 cantidad2'",
        variant: "destructive",
      });
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  }, [excelData, onUpdateStock, wordsToNumber, toast]);

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

      {/* Ayuda de comandos ACTUALIZADA */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">💡 Comandos disponibles:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>➕ Comando simple:</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Vino Emina doce"</li>
                <li>• "Cerveza seis"</li>
                <li>• "Azúcar treinta y cuatro"</li>
              </ul>
            </div>
            <div>
              <strong>🎯 Comandos múltiples (NUEVO):</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Vino Beronia 12, Cerveza 6 y Vodka 8"</li>
                <li>• "Ginebra Beefeater 5, Whisky 10"</li>
                <li>• "Azúcar 15 también sal 8"</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">🚀 ¡NUEVO! Inventariado rápido:</h4>
            <p className="text-sm text-yellow-700">
              Ahora puedes dictar varios productos a la vez separados por comas, "y" o "también". 
              El sistema te guiará paso a paso para confirmar cada producto.
            </p>
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
            <p>🎯 <strong>NUEVO:</strong> Comandos múltiples para inventariado rápido</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
