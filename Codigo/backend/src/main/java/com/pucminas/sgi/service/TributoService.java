package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.CalcularTributoRequestDTO;
import com.pucminas.sgi.dto.request.CreditoTributoRequestDTO;
import com.pucminas.sgi.dto.request.NotaFiscalTributoRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.util.AliquotasReformaTributaria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Cálculos da Reforma Tributária: CBS (ex-PIS/COFINS) e IBS (ex-ICMS/ISS).
 * Fórmulas: por dentro, por fora, separação CBS/IBS, crédito, nota fiscal, margem de lucro.
 */
@Service
public class TributoService {

    private static final int SCALE = 6;
    private static final int SCALE2 = 2;
    private static final RoundingMode ROUND = RoundingMode.HALF_UP;

    /**
     * Cálculo "por dentro": valor já inclui imposto.
     * baseCalculo = valorTotal / (1 + aliquota), imposto = valorTotal - baseCalculo
     */
    public CalcularTributoResponseDTO calcularPorDentro(BigDecimal valorTotal, BigDecimal aliquota) {
        if (aliquota.compareTo(BigDecimal.ZERO) == 0) {
            return CalcularTributoResponseDTO.builder()
                    .baseCalculo(AliquotasReformaTributaria.scale2(valorTotal))
                    .valorImposto(BigDecimal.ZERO)
                    .valorSemImposto(AliquotasReformaTributaria.scale2(valorTotal))
                    .valorTotal(valorTotal)
                    .totalImpostos(BigDecimal.ZERO)
                    .build();
        }
        BigDecimal umMaisAliquota = BigDecimal.ONE.add(aliquota);
        BigDecimal baseCalculo = valorTotal.divide(umMaisAliquota, SCALE, ROUND);
        BigDecimal imposto = valorTotal.subtract(baseCalculo);
        return CalcularTributoResponseDTO.builder()
                .baseCalculo(AliquotasReformaTributaria.scale2(baseCalculo))
                .valorImposto(AliquotasReformaTributaria.scale2(imposto))
                .valorSemImposto(AliquotasReformaTributaria.scale2(baseCalculo))
                .valorTotal(AliquotasReformaTributaria.scale2(valorTotal))
                .totalImpostos(AliquotasReformaTributaria.scale2(imposto))
                .build();
    }

    /**
     * Cálculo "por fora": adicionar imposto ao valor base.
     */
    public CalcularTributoResponseDTO calcularPorFora(BigDecimal valorBase, BigDecimal aliquota) {
        BigDecimal imposto = valorBase.multiply(aliquota).setScale(SCALE, ROUND);
        BigDecimal valorTotal = valorBase.add(imposto);
        return CalcularTributoResponseDTO.builder()
                .baseCalculo(AliquotasReformaTributaria.scale2(valorBase))
                .valorImposto(AliquotasReformaTributaria.scale2(imposto))
                .valorTotal(AliquotasReformaTributaria.scale2(valorTotal))
                .totalImpostos(AliquotasReformaTributaria.scale2(imposto))
                .build();
    }

    /**
     * Separa CBS e IBS a partir de valor total (já com imposto).
     */
    public CalcularTributoResponseDTO separarCbsIbs(BigDecimal valorTotal, String categoria) {
        BigDecimal totalAliquota = AliquotasReformaTributaria.getTotal(categoria);
        CalcularTributoResponseDTO porDentro = calcularPorDentro(valorTotal, totalAliquota);
        BigDecimal base = porDentro.getBaseCalculo();
        BigDecimal cbs = base.multiply(AliquotasReformaTributaria.getCbs(categoria)).setScale(SCALE, ROUND);
        BigDecimal ibs = base.multiply(AliquotasReformaTributaria.getIbs(categoria)).setScale(SCALE, ROUND);
        return CalcularTributoResponseDTO.builder()
                .baseCalculo(base)
                .valorSemImposto(base)
                .cbs(AliquotasReformaTributaria.scale2(cbs))
                .ibs(AliquotasReformaTributaria.scale2(ibs))
                .totalImpostos(AliquotasReformaTributaria.scale2(cbs.add(ibs)))
                .valorTotal(AliquotasReformaTributaria.scale2(valorTotal))
                .categoria(categoria != null ? categoria : "PLENO")
                .tipo("SEPARAR_CBS_IBS")
                .build();
    }

    /**
     * Crédito tributário (não-cumulatividade): imposto devido = saída - crédito entrada.
     */
    public CreditoTributoResponseDTO calcularComCredito(CreditoTributoRequestDTO req) {
        String cat = req.getCategoria() != null ? req.getCategoria() : "PLENO";
        BigDecimal aliquota = AliquotasReformaTributaria.getTotal(cat);
        BigDecimal impostoSaida = req.getValorVenda().multiply(aliquota).setScale(SCALE, ROUND);
        BigDecimal creditoEntrada = req.getValorCompras().multiply(aliquota).setScale(SCALE, ROUND);
        BigDecimal impostoAPagar = impostoSaida.subtract(creditoEntrada);
        BigDecimal impostoDevido = impostoAPagar.compareTo(BigDecimal.ZERO) > 0 ? impostoAPagar : BigDecimal.ZERO;
        BigDecimal creditoAcumulado = impostoAPagar.compareTo(BigDecimal.ZERO) < 0 ? impostoAPagar.abs() : BigDecimal.ZERO;
        return CreditoTributoResponseDTO.builder()
                .impostoSaida(AliquotasReformaTributaria.scale2(impostoSaida))
                .creditoEntrada(AliquotasReformaTributaria.scale2(creditoEntrada))
                .impostoDevido(AliquotasReformaTributaria.scale2(impostoDevido))
                .creditoAcumulado(AliquotasReformaTributaria.scale2(creditoAcumulado))
                .categoria(cat)
                .build();
    }

    /**
     * Nota fiscal: soma de itens com valor total (já com imposto), retorna totais CBS/IBS.
     */
    public NotaFiscalTributoResponseDTO calcularNotaFiscal(NotaFiscalTributoRequestDTO req) {
        String cat = req.getCategoria() != null ? req.getCategoria() : "PLENO";
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalCBS = BigDecimal.ZERO;
        BigDecimal totalIBS = BigDecimal.ZERO;
        for (NotaFiscalTributoRequestDTO.ItemNotaFiscalDTO item : req.getItens()) {
            CalcularTributoResponseDTO calc = separarCbsIbs(item.getValorTotal(), cat);
            subtotal = subtotal.add(calc.getBaseCalculo());
            totalCBS = totalCBS.add(calc.getCbs() != null ? calc.getCbs() : BigDecimal.ZERO);
            totalIBS = totalIBS.add(calc.getIbs() != null ? calc.getIbs() : BigDecimal.ZERO);
        }
        BigDecimal totalImpostos = totalCBS.add(totalIBS);
        BigDecimal totalNota = subtotal.add(totalImpostos);
        BigDecimal aliquotaEfetiva = subtotal.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalImpostos.divide(subtotal, 4, ROUND).multiply(BigDecimal.valueOf(100));
        return NotaFiscalTributoResponseDTO.builder()
                .subtotal(AliquotasReformaTributaria.scale2(subtotal))
                .cbs(AliquotasReformaTributaria.scale2(totalCBS))
                .ibs(AliquotasReformaTributaria.scale2(totalIBS))
                .totalImpostos(AliquotasReformaTributaria.scale2(totalImpostos))
                .totalNota(AliquotasReformaTributaria.scale2(totalNota))
                .aliquotaEfetivaPercentual(AliquotasReformaTributaria.scale2(aliquotaEfetiva))
                .categoria(cat)
                .build();
    }

    /**
     * Margem de lucro: preço de venda dado custo, margem e alíquota.
     * precoVenda = custo / (1 - margem - aliquota)
     */
    public CalcularTributoResponseDTO calcularPrecoVenda(BigDecimal custoAquisicao, BigDecimal margemDesejada, String categoria) {
        BigDecimal aliquota = AliquotasReformaTributaria.getTotal(categoria);
        BigDecimal denominador = BigDecimal.ONE.subtract(margemDesejada).subtract(aliquota);
        if (denominador.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Margem + alíquota devem ser menores que 100%");
        }
        BigDecimal precoVenda = custoAquisicao.divide(denominador, SCALE, ROUND);
        BigDecimal margemLucro = precoVenda.multiply(margemDesejada).setScale(SCALE, ROUND);
        BigDecimal impostos = precoVenda.multiply(aliquota).setScale(SCALE, ROUND);
        return CalcularTributoResponseDTO.builder()
                .custoAquisicao(AliquotasReformaTributaria.scale2(custoAquisicao))
                .precoVenda(AliquotasReformaTributaria.scale2(precoVenda))
                .margemLucro(AliquotasReformaTributaria.scale2(margemLucro))
                .totalImpostos(AliquotasReformaTributaria.scale2(impostos))
                .categoria(categoria != null ? categoria : "PLENO")
                .tipo("MARGEM_LUCRO")
                .build();
    }

    /**
     * Dispatcher: executa o tipo de cálculo solicitado.
     */
    public CalcularTributoResponseDTO calcular(CalcularTributoRequestDTO req) {
        String tipo = req.getTipo() != null ? req.getTipo().toUpperCase() : "POR_DENTRO";
        String cat = req.getCategoria() != null ? req.getCategoria() : "PLENO";
        BigDecimal aliquota = AliquotasReformaTributaria.getTotal(cat);

        return switch (tipo) {
            case "POR_FORA" -> {
                CalcularTributoResponseDTO r = calcularPorFora(req.getValor(), aliquota);
                r.setTipo("POR_FORA");
                r.setCategoria(cat);
                yield r;
            }
            case "SEPARAR_CBS_IBS" -> separarCbsIbs(req.getValor(), cat);
            case "MARGEM_LUCRO" -> {
                if (req.getCustoAquisicao() == null || req.getMargemDesejada() == null) {
                    throw new IllegalArgumentException("Para MARGEM_LUCRO informe custoAquisicao e margemDesejada");
                }
                yield calcularPrecoVenda(req.getCustoAquisicao(), req.getMargemDesejada(), cat);
            }
            default -> {
                CalcularTributoResponseDTO r = calcularPorDentro(req.getValor(), aliquota);
                r.setTipo("POR_DENTRO");
                r.setCategoria(cat);
                yield r;
            }
        };
    }

    public AliquotasResponseDTO getAliquotas(String categoria) {
        String cat = categoria != null ? categoryOrDefault(categoria) : "PLENO";
        return AliquotasResponseDTO.builder()
                .categoria(cat)
                .cbs(AliquotasReformaTributaria.getCbs(cat))
                .ibs(AliquotasReformaTributaria.getIbs(cat))
                .total(AliquotasReformaTributaria.getTotal(cat))
                .build();
    }

    private static String categoryOrDefault(String c) {
        return c == null || c.isBlank() ? "PLENO" : c.toUpperCase();
    }

    /**
     * Cashback: devolução da CBS (ex.: 100% para baixa renda).
     */
    public BigDecimal calcularCashback(BigDecimal valorCompra, BigDecimal percentualDevolucao) {
        if (percentualDevolucao == null) percentualDevolucao = BigDecimal.ONE;
        CalcularTributoResponseDTO c = calcularPorDentro(valorCompra, AliquotasReformaTributaria.CBS_PLENO);
        BigDecimal cbsNoValor = c.getValorImposto() != null ? c.getValorImposto() : BigDecimal.ZERO;
        return AliquotasReformaTributaria.scale2(cbsNoValor.multiply(percentualDevolucao));
    }
}
