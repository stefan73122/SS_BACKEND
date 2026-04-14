function numeroALetras(numero) {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (numero === 0) return 'CERO';
  if (numero === 100) return 'CIEN';

  let resultado = '';
  
  // Parte entera
  const parteEntera = Math.floor(numero);
  
  // Millones
  if (parteEntera >= 1000000) {
    const millones = Math.floor(parteEntera / 1000000);
    if (millones === 1) {
      resultado += 'UN MILLÓN ';
    } else {
      resultado += numeroALetras(millones) + ' MILLONES ';
    }
    numero = parteEntera % 1000000;
  }

  // Miles
  if (parteEntera >= 1000) {
    const miles = Math.floor(parteEntera / 1000);
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += numeroALetras(miles) + ' MIL ';
    }
    numero = parteEntera % 1000;
  }

  // Centenas
  if (parteEntera >= 100) {
    const cent = Math.floor(parteEntera / 100);
    resultado += centenas[cent] + ' ';
    numero = parteEntera % 100;
  }

  // Decenas y unidades
  if (parteEntera >= 20) {
    const dec = Math.floor(parteEntera / 10);
    resultado += decenas[dec];
    const uni = parteEntera % 10;
    if (uni > 0) {
      resultado += ' Y ' + unidades[uni];
    }
  } else if (parteEntera >= 10) {
    resultado += especiales[parteEntera - 10];
  } else if (parteEntera > 0) {
    resultado += unidades[parteEntera];
  }

  return resultado.trim();
}

function montoALetras(monto, moneda = 'BOLIVIANOS') {
  const parteEntera = Math.floor(monto);
  const parteDecimal = Math.round((monto - parteEntera) * 100);

  let resultado = numeroALetras(parteEntera) + ' ' + moneda;
  
  if (parteDecimal > 0) {
    resultado += ' CON ' + parteDecimal.toString().padStart(2, '0') + '/100';
  } else {
    resultado += ' CON 00/100';
  }

  return resultado;
}

module.exports = {
  numeroALetras,
  montoALetras,
};
