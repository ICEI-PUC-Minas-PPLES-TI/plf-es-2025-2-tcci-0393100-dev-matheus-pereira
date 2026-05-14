package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.AgingReportDTO;
import com.pucminas.sgi.dto.response.EfetividadeCobrancaDTO;
import com.pucminas.sgi.dto.response.RankingDevedoresDTO;
import com.pucminas.sgi.dto.response.RelatorioInadimplentesDTO;
import com.pucminas.sgi.dto.response.ResumoFinanceiroDTO;
import com.pucminas.sgi.dto.response.ResumoRelatorioDTO;
import com.pucminas.sgi.dto.response.ExtratoClienteDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.time.temporal.ChronoUnit;
import java.util.stream.Collectors;

/**
 * Serviço de relatórios: inadimplentes, ranking, resumo e exportação PDF/Excel.
 */
@Service
public class RelatorioService {

    private static final Logger log = LoggerFactory.getLogger(RelatorioService.class);

    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final PagamentoRepository pagamentoRepository;
    private final NotificacaoEmailRepository notificacaoEmailRepository;
    private final DividaService dividaService;

    public RelatorioService(ClienteRepository clienteRepository,
                            DividaRepository dividaRepository,
                            PagamentoRepository pagamentoRepository,
                            NotificacaoEmailRepository notificacaoEmailRepository,
                            DividaService dividaService) {
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.notificacaoEmailRepository = notificacaoEmailRepository;
        this.dividaService = dividaService;
    }

    private static BigDecimal centavosParaReais(BigDecimal centavos) {
        return centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public RelatorioInadimplentesDTO gerarRelatorioInadimplentes(LocalDate periodoInicio, LocalDate periodoFim, List<StatusDivida> filtros) {
        final LocalDate inicio = periodoInicio != null ? periodoInicio : LocalDate.MIN;
        final LocalDate fim = periodoFim != null ? periodoFim : LocalDate.MAX;
        List<StatusDivida> status = filtros != null && !filtros.isEmpty()
                ? filtros
                : List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.VENCIDA);
        List<Divida> dividas = dividaRepository.findByStatusDividaIn(status).stream()
                .filter(d -> !d.getVencimento().isBefore(inicio) && !d.getVencimento().isAfter(fim))
                .collect(Collectors.toList());
        List<RelatorioInadimplentesDTO.ItemInadimplenteDTO> itens = new ArrayList<>();
        BigDecimal valorTotal = BigDecimal.ZERO;
        for (Divida d : dividas) {
            Cliente c = d.getCliente();
            if (d.getValorDevedor().compareTo(BigDecimal.ZERO) <= 0) continue;
            RelatorioInadimplentesDTO.ItemInadimplenteDTO item = RelatorioInadimplentesDTO.ItemInadimplenteDTO.builder()
                    .nomeCliente(c.getNome())
                    .cpfCnpj(c.getCpfCnpj())
                    .quantidadeDividas(1)
                    .saldoDevedor(centavosParaReais(d.getValorDevedor()))
                    .dataVencimentoMaisAntiga(d.getVencimento())
                    .build();
            itens.add(item);
            valorTotal = valorTotal.add(d.getValorDevedor());
        }
        return RelatorioInadimplentesDTO.builder()
                .periodoInicio(inicio)
                .periodoFim(fim)
                .totalClientesInadimplentes(itens.size())
                .valorTotalInadimplente(centavosParaReais(valorTotal))
                .itens(itens)
                .build();
    }

    @Transactional(readOnly = true)
    public RankingDevedoresDTO gerarRankingMaioresDevedores(int limite) {
        List<Cliente> top = clienteRepository.findTop10ByOrderBySaldoDevedorDesc();
        if (limite > 0 && limite < top.size()) {
            top = top.subList(0, limite);
        }
        List<RankingDevedoresDTO.ItemRankingDTO> itensRanking = new ArrayList<>();
        int pos = 1;
        for (Cliente c : top) {
            if (c.getSaldoDevedor().compareTo(BigDecimal.ZERO) <= 0) continue;
            itensRanking.add(RankingDevedoresDTO.ItemRankingDTO.builder()
                    .clienteId(c.getClienteId())
                    .nomeCliente(c.getNome())
                    .cpfCnpj(c.getCpfCnpj())
                    .saldoDevedor(centavosParaReais(c.getSaldoDevedor()))
                    .posicao(pos++)
                    .build());
        }
        return RankingDevedoresDTO.builder()
                .limite(limite > 0 ? limite : 10)
                .ranking(itensRanking)
                .build();
    }

    @Transactional(readOnly = true)
    public AgingReportDTO gerarAgingReport() {
        LocalDate hoje = LocalDate.now();
        List<Divida> dividas = dividaRepository.findByStatusDividaIn(
                List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.VENCIDA)
        ).stream()
                .filter(d -> d.getValorDevedor() != null && d.getValorDevedor().compareTo(BigDecimal.ZERO) > 0)
                .filter(d -> !d.getVencimento().isAfter(hoje))
                .toList();

        BigDecimal valor0a30 = BigDecimal.ZERO;
        BigDecimal valor31a60 = BigDecimal.ZERO;
        BigDecimal valor61a90 = BigDecimal.ZERO;
        BigDecimal valorMais90 = BigDecimal.ZERO;
        int qtd0a30 = 0;
        int qtd31a60 = 0;
        int qtd61a90 = 0;
        int qtdMais90 = 0;

        for (Divida d : dividas) {
            int diasAtraso = (int) ChronoUnit.DAYS.between(d.getVencimento(), hoje);
            if (diasAtraso <= 30) {
                qtd0a30++;
                valor0a30 = valor0a30.add(d.getValorDevedor());
            } else if (diasAtraso <= 60) {
                qtd31a60++;
                valor31a60 = valor31a60.add(d.getValorDevedor());
            } else if (diasAtraso <= 90) {
                qtd61a90++;
                valor61a90 = valor61a90.add(d.getValorDevedor());
            } else {
                qtdMais90++;
                valorMais90 = valorMais90.add(d.getValorDevedor());
            }
        }

        List<AgingReportDTO.FaixaAgingDTO> faixas = List.of(
                AgingReportDTO.FaixaAgingDTO.builder()
                        .faixa("0-30")
                        .quantidade(qtd0a30)
                        .valor(centavosParaReais(valor0a30))
                        .build(),
                AgingReportDTO.FaixaAgingDTO.builder()
                        .faixa("31-60")
                        .quantidade(qtd31a60)
                        .valor(centavosParaReais(valor31a60))
                        .build(),
                AgingReportDTO.FaixaAgingDTO.builder()
                        .faixa("61-90")
                        .quantidade(qtd61a90)
                        .valor(centavosParaReais(valor61a90))
                        .build(),
                AgingReportDTO.FaixaAgingDTO.builder()
                        .faixa("+90")
                        .quantidade(qtdMais90)
                        .valor(centavosParaReais(valorMais90))
                        .build()
        );

        BigDecimal valorTotal = valor0a30.add(valor31a60).add(valor61a90).add(valorMais90);
        return AgingReportDTO.builder()
                .totalDividas(dividas.size())
                .valorTotal(centavosParaReais(valorTotal))
                .faixas(faixas)
                .build();
    }

    @Transactional(readOnly = true)
    public EfetividadeCobrancaDTO gerarEfetividadeCobranca(Integer ano, Integer mes) {
        LocalDate referencia = LocalDate.now();
        int anoRef = (ano != null && ano > 2000) ? ano : referencia.getYear();
        int mesRef = (mes != null && mes >= 1 && mes <= 12) ? mes : referencia.getMonthValue();

        LocalDate inicioData = LocalDate.of(anoRef, mesRef, 1);
        LocalDate fimData = inicioData.withDayOfMonth(inicioData.lengthOfMonth());
        LocalDateTime inicio = inicioData.atStartOfDay();
        LocalDateTime fim = fimData.plusDays(1).atStartOfDay();

        List<NotificacaoEmail> cobrancas = notificacaoEmailRepository.findByCriadoEmBetween(inicio, fim).stream()
                .filter(n -> n.getTipo() == com.pucminas.sgi.enums.TipoNotificacao.COBRANCA)
                .toList();

        int totalCobrancas = cobrancas.size();
        int enviadas = (int) cobrancas.stream().filter(n -> n.getStatusEnvio() == com.pucminas.sgi.enums.StatusEnvio.ENVIADO).count();
        int falhas = (int) cobrancas.stream().filter(n -> n.getStatusEnvio() == com.pucminas.sgi.enums.StatusEnvio.FALHOU).count();

        List<Pagamento> pagamentos = pagamentoRepository.findByDataPagamentoBetween(inicioData, fimData);
        int pagamentosRecebidos = pagamentos.size();
        BigDecimal valorRecebidoCentavos = pagamentos.stream()
                .map(Pagamento::getValorPago)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxaEfetividade = totalCobrancas == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(enviadas)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalCobrancas), 2, RoundingMode.HALF_UP);

        return EfetividadeCobrancaDTO.builder()
                .ano(anoRef)
                .mes(mesRef)
                .totalCobrancas(totalCobrancas)
                .cobrancasEnviadas(enviadas)
                .cobrancasComFalha(falhas)
                .pagamentosRecebidos(pagamentosRecebidos)
                .valorRecebidoTotal(centavosParaReais(valorRecebidoCentavos))
                .taxaEfetividade(taxaEfetividade)
                .build();
    }

    /** Resumo para dashboard (contrato frontend: totalClientes, totalDividas, totalEmAberto, totalPago). */
    @Transactional(readOnly = true)
    public ResumoRelatorioDTO gerarResumo(Integer dias) {
        int totalClientes = (int) clienteRepository.count();
        List<Divida> todasDividas = dividaRepository.findAll();
        LocalDate limite = (dias != null && dias > 0) ? LocalDate.now().minusDays(dias) : null;
        BigDecimal totalEmAbertoReais = BigDecimal.ZERO;
        int dividasNoPeriodo = 0;
        for (Divida d : todasDividas) {
            if (d.getStatusDivida() == StatusDivida.QUITADA || d.getStatusDivida() == StatusDivida.CANCELADA) continue;
            if (limite != null && d.getVencimento().isBefore(limite)) continue;
            BigDecimal[] valorEJuros = dividaService.getValorEJurosReais(d);
            totalEmAbertoReais = totalEmAbertoReais.add(valorEJuros[0]);
            dividasNoPeriodo++;
        }
        BigDecimal totalPago = pagamentoRepository.findAll().stream()
                .map(Pagamento::getValorPago)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPagoReais = centavosParaReais(totalPago);
        return ResumoRelatorioDTO.builder()
                .totalClientes(totalClientes)
                .totalDividas(dividasNoPeriodo)
                .totalEmAberto(totalEmAbertoReais)
                .totalPago(totalPagoReais)
                .build();
    }

    @Transactional(readOnly = true)
    public ResumoFinanceiroDTO gerarResumoFinanceiro(LocalDate periodoInicio, LocalDate periodoFim) {
        if (periodoInicio == null) periodoInicio = LocalDate.now().minusMonths(1);
        if (periodoFim == null) periodoFim = LocalDate.now();
        List<Pagamento> pagamentos = pagamentoRepository.findByDataPagamentoBetween(periodoInicio, periodoFim);
        BigDecimal totalRecebido = pagamentos.stream().map(Pagamento::getValorPago).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Divida> emAberto = dividaRepository.findByStatusDividaIn(List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.VENCIDA));
        BigDecimal totalEmAbertoReais = BigDecimal.ZERO;
        for (Divida d : emAberto) {
            totalEmAbertoReais = totalEmAbertoReais.add(dividaService.getValorEJurosReais(d)[0]);
        }
        long quitadas = dividaRepository.findByStatusDividaIn(List.of(StatusDivida.QUITADA)).size();
        long clientesInadimplentes = clienteRepository.findTop10ByOrderBySaldoDevedorDesc().stream()
                .filter(c -> c.getSaldoDevedor().compareTo(BigDecimal.ZERO) > 0).count();
        return ResumoFinanceiroDTO.builder()
                .periodoInicio(periodoInicio)
                .periodoFim(periodoFim)
                .totalRecebido(centavosParaReais(totalRecebido))
                .totalEmAberto(totalEmAbertoReais)
                .quantidadeDividasQuitadas((int) quitadas)
                .quantidadeDividasEmAberto(emAberto.size())
                .quantidadeClientesInadimplentes((int) clientesInadimplentes)
                .build();
    }

    @Transactional(readOnly = true)
    public ExtratoClienteDTO gerarExtratoCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        List<Divida> dividas = dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .filter(d -> d.getValorDevedor().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
        List<ExtratoClienteDTO.ExtratoDividaItem> dividasAtivas = new ArrayList<>();
        LocalDate hoje = LocalDate.now();
        for (Divida d : dividas) {
            int diasAtraso = d.getVencimento().isBefore(hoje) ? (int) java.time.temporal.ChronoUnit.DAYS.between(d.getVencimento(), hoje) : 0;
            dividasAtivas.add(ExtratoClienteDTO.ExtratoDividaItem.builder()
                    .id(d.getDividaId())
                    .protocolo(d.getProtocolo())
                    .descricao(d.getDescricao() != null ? d.getDescricao() : "")
                    .vencimento(d.getVencimento().format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .valorOriginal(centavosParaReais(d.getValorOriginal()))
                    .valorDevido(centavosParaReais(d.getValorDevedor()))
                    .status(d.getStatusDivida().name())
                    .diasAtraso(diasAtraso)
                    .build());
        }
        List<Pagamento> pagamentos = pagamentoRepository.findAll().stream()
                .filter(p -> p.getDivida().getCliente().getClienteId().equals(clienteId))
                .sorted((a, b) -> b.getDataPagamento().compareTo(a.getDataPagamento()))
                .limit(50)
                .collect(Collectors.toList());
        List<ExtratoClienteDTO.ExtratoPagamentoItem> historico = new ArrayList<>();
        for (Pagamento p : pagamentos) {
            historico.add(ExtratoClienteDTO.ExtratoPagamentoItem.builder()
                    .data(p.getDataPagamento().format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .protocolo(p.getDivida().getProtocolo())
                    .valorPago(centavosParaReais(p.getValorPago()))
                    .metodo(p.getMetodoPagamento() != null ? p.getMetodoPagamento() : "")
                    .saldoApos(centavosParaReais(p.getDivida().getValorDevedor()))
                    .build());
        }
        List<NotificacaoEmail> notifs = notificacaoEmailRepository.findByClienteIdOrderByDataEnvioDesc(clienteId);
        List<ExtratoClienteDTO.ExtratoNotificacaoItem> notifItems = notifs.stream()
                .map(n -> ExtratoClienteDTO.ExtratoNotificacaoItem.builder()
                        .data(n.getDataEnvio() != null ? n.getDataEnvio().format(DateTimeFormatter.ISO_LOCAL_DATE) : n.getCriadoEm().format(DateTimeFormatter.ISO_LOCAL_DATE))
                        .tipo(n.getTipo().name())
                        .status(n.getStatusEnvio().name())
                        .tentativas(n.getTentativas())
                        .build())
                .collect(Collectors.toList());
        return ExtratoClienteDTO.builder()
                .cliente(ExtratoClienteDTO.ExtratoClienteInfo.builder()
                        .nome(c.getNome())
                        .cpfCnpj(c.getCpfCnpj())
                        .telefone(c.getTelefone())
                        .celular(c.getCelular())
                        .email(c.getEmail())
                        .status(c.getStatusCliente().name())
                        .saldoDevedorTotal(centavosParaReais(c.getSaldoDevedor()))
                        .build())
                .dividasAtivas(dividasAtivas)
                .historicoPagamentos(historico)
                .notificacoes(notifItems)
                .build();
    }

    @Transactional(readOnly = true)
    public Resource exportarRelatorioPDF(String tipoRelatorio, LocalDate periodoInicio, LocalDate periodoFim) {
        byte[] pdf = gerarPDF(tipoRelatorio, periodoInicio, periodoFim);
        return new ByteArrayResource(pdf);
    }

    @Transactional(readOnly = true)
    public Resource exportarRelatorioExcel(String tipoRelatorio, LocalDate periodoInicio, LocalDate periodoFim) {
        byte[] xlsx = gerarExcel(tipoRelatorio, periodoInicio, periodoFim);
        return new ByteArrayResource(xlsx);
    }

    private byte[] gerarPDF(String tipo, LocalDate inicio, LocalDate fim) {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);
            document.open();
            document.add(new com.lowagie.text.Paragraph("Relatório SGI - " + tipo, com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 16)));
            document.add(new com.lowagie.text.Paragraph("Período: " + inicio + " a " + fim));
            document.add(new com.lowagie.text.Paragraph("Gerado em: " + java.time.LocalDateTime.now()));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.warn("Falha ao gerar PDF: {}", e.getMessage());
            return new byte[0];
        }
    }

    private byte[] gerarExcel(String tipo, LocalDate inicio, LocalDate fim) {
        try {
            org.apache.poi.ss.usermodel.Workbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = wb.createSheet("Relatório");
            org.apache.poi.ss.usermodel.Row row0 = sheet.createRow(0);
            row0.createCell(0).setCellValue("Relatório SGI - " + tipo);
            org.apache.poi.ss.usermodel.Row row1 = sheet.createRow(1);
            row1.createCell(0).setCellValue("Período: " + inicio + " a " + fim);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            wb.write(out);
            wb.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.warn("Falha ao gerar Excel: {}", e.getMessage());
            return new byte[0];
        }
    }
}
