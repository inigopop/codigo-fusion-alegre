import { useState, useEffect } from 'react';

export interface ProductAlias {
  productId: string; // Índice o ID único del producto
  productName: string; // Nombre original
  aliases: string[]; // Alternativas de reconocimiento
}

const STORAGE_KEY = 'inventory_product_aliases';

// Aliases predefinidos comunes para productos típicos
const DEFAULT_ALIASES: Record<string, string[]> = {
  // Licores comunes
  'santa teresa': ['sta teresa', 'santateresa', 'st teresa', 'santa tere'],
  'ron': ['rhon'],
  'whisky': ['wiski', 'güisqui', 'whiskey'],
  'vodka': ['vodca', 'vodka'],
  'gin': ['yin', 'gin tonic'],
  'pisco': ['piscu'],
  
  // Cervezas
  'polar': ['polar pilsen', 'polar ice', 'polar light'],
  'heineken': ['heineken', 'ayneken'],
  'corona': ['korona'],
  
  // Refrescos
  'coca cola': ['cocacola', 'coca', 'coke'],
  'pepsi': ['pepsy'],
  'sprite': ['esprite'],
  
  // Abreviaturas comunes
  'botella': ['bot', 'btl', 'botell'],
  'litro': ['lt', 'lts', 'l'],
  'unidad': ['un', 'und', 'u'],
  'caja': ['cx', 'cajas'],
};

export const useProductAliases = (excelData: any[]) => {
  const [aliases, setAliases] = useState<ProductAlias[]>([]);

  // Cargar aliases desde localStorage al iniciar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAliases(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading aliases:', e);
      }
    }
  }, []);

  // Generar aliases automáticos cuando cambia excelData
  useEffect(() => {
    if (excelData.length === 0) return;

    const generatedAliases: ProductAlias[] = excelData.map((item, index) => {
      const productName = (item.Producto || '').toString().toLowerCase();
      const generatedVariants = generateAutoAliases(productName);
      
      return {
        productId: String(index),
        productName: item.Producto || '',
        aliases: generatedVariants,
      };
    });

    setAliases(generatedAliases);
  }, [excelData]);

  // Guardar aliases en localStorage
  const saveAliases = (newAliases: ProductAlias[]) => {
    setAliases(newAliases);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAliases));
  };

  // Añadir alias personalizado
  const addAlias = (productId: string, alias: string) => {
    const updated = aliases.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          aliases: [...new Set([...item.aliases, alias.toLowerCase()])],
        };
      }
      return item;
    });
    saveAliases(updated);
  };

  // Buscar producto por texto incluyendo aliases
  const findProductByText = (searchText: string): { index: number; matchType: string } | null => {
    const normalized = normalizeText(searchText);
    
    for (let i = 0; i < aliases.length; i++) {
      const alias = aliases[i];
      
      // Buscar coincidencia exacta en nombre
      if (normalizeText(alias.productName) === normalized) {
        return { index: i, matchType: 'exact' };
      }
      
      // Buscar en aliases
      for (const alt of alias.aliases) {
        if (normalizeText(alt) === normalized) {
          return { index: i, matchType: 'alias' };
        }
        
        // Buscar coincidencias parciales
        if (normalized.includes(normalizeText(alt)) || normalizeText(alt).includes(normalized)) {
          return { index: i, matchType: 'partial' };
        }
      }
    }
    
    return null;
  };

  // Obtener vocabulario expandido (nombres + aliases) para Whisper
  const getExpandedVocabulary = (): string[] => {
    const vocab = new Set<string>();
    
    aliases.forEach(item => {
      vocab.add(item.productName.toLowerCase());
      item.aliases.forEach(alias => vocab.add(alias.toLowerCase()));
      
      // Añadir palabras individuales significativas
      const words = item.productName.toLowerCase()
        .replace(/[^\w\sáéíóúñü]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);
      words.forEach(w => vocab.add(w));
    });
    
    return Array.from(vocab);
  };

  return {
    aliases,
    addAlias,
    findProductByText,
    getExpandedVocabulary,
  };
};

// Generar aliases automáticos para un producto
function generateAutoAliases(productName: string): string[] {
  const aliases = new Set<string>();
  const lower = productName.toLowerCase();
  
  // Añadir el nombre original
  aliases.add(lower);
  
  // Buscar aliases predefinidos
  Object.entries(DEFAULT_ALIASES).forEach(([key, variants]) => {
    if (lower.includes(key)) {
      variants.forEach(variant => {
        const replaced = lower.replace(key, variant);
        aliases.add(replaced);
      });
    }
  });
  
  // Generar variaciones sin caracteres especiales
  const withoutSpecial = lower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutSpecial !== lower) {
    aliases.add(withoutSpecial);
  }
  
  // Generar variaciones sin acentos
  const withoutAccents = lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (withoutAccents !== lower) {
    aliases.add(withoutAccents);
  }
  
  // Abreviaturas comunes (ejemplo: "Santa Teresa 12" -> "st 12", "sta teresa 12")
  const abbreviated = lower
    .replace(/\bsanta\b/g, 'sta')
    .replace(/\bsanto\b/g, 'sto')
    .replace(/\bdoctor\b/g, 'dr')
    .replace(/\bseñor\b/g, 'sr');
  if (abbreviated !== lower) {
    aliases.add(abbreviated);
  }
  
  return Array.from(aliases);
}

// Normalizar texto para comparación
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
