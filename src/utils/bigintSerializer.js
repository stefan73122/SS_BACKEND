function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Manejar objetos Decimal de Prisma (formato nativo)
  if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Decimal') {
    return parseFloat(obj.toString());
  }

  // Manejar objetos Decimal serializados por Prisma (formato {s, e, d})
  if (obj && typeof obj === 'object' && 's' in obj && 'e' in obj && 'd' in obj && Array.isArray(obj.d)) {
    // Reconstruir el número desde el formato interno de Decimal
    const sign = obj.s;
    const exponent = obj.e;
    const digits = obj.d;
    
    let numStr = digits.join('');
    const decimalPos = exponent + 1;
    
    if (decimalPos <= 0) {
      numStr = '0.' + '0'.repeat(-decimalPos) + numStr;
    } else if (decimalPos >= numStr.length) {
      numStr = numStr + '0'.repeat(decimalPos - numStr.length);
    } else {
      numStr = numStr.slice(0, decimalPos) + '.' + numStr.slice(decimalPos);
    }
    
    return parseFloat((sign === -1 ? '-' : '') + numStr);
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

module.exports = { serializeBigInt };
