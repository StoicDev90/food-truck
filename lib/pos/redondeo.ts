// PostgreSQL numeric rounds ties away from zero.
export function redondearDivision(numerador: bigint, denominador: bigint): bigint {
  const cero = BigInt(0)
  const negativo = (numerador < cero) !== (denominador < cero)
  const n = numerador < cero ? -numerador : numerador
  const d = denominador < cero ? -denominador : denominador
  const resultado = (n + d / BigInt(2)) / d
  return negativo ? -resultado : resultado
}

// Interpret the number's decimal representation before rounding to the given scale.
export function decimalesAEntero(valor: number, decimales: number): bigint {
  const [mantisa, exponente = '0'] = valor.toString().toLowerCase().split('e')
  const negativo = mantisa.startsWith('-')
  const [entero, fraccion = ''] = (negativo ? mantisa.slice(1) : mantisa).split('.')
  const digitos = BigInt(entero + fraccion)
  const escala = Number(exponente) - fraccion.length + decimales
  const potencia = BigInt(10) ** BigInt(Math.abs(escala))
  const resultado = escala >= 0 ? digitos * potencia : redondearDivision(digitos, potencia)
  return negativo ? -resultado : resultado
}
