package com.pucminas.sgi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Integração com a API Gemini (Google) para consultas sobre reforma tributária.
 * A chave da API deve ser configurada via variável de ambiente GEMINI_API_KEY.
 * Modelo padrão: gemini-2.5-flash (estável). gemini-1.5-flash não está mais disponível na API.
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    /**
     * Contexto fixo enviado à IA com base na Lei Complementar nº 214/2025 (IBS, CBS e IS).
     * Utilizado para orientar respostas sobre reforma tributária com fundamento legal.
     */
    private static final String SYSTEM_CONTEXT = buildSystemContext();

    private static String buildSystemContext() {
        return """
            Você é um assistente especializado na Reforma Tributária brasileira, com base na Lei Complementar nº 214, de 16 de janeiro de 2025. \
            Responda de forma clara e objetiva, preferindo sempre citar a lei e os princípios abaixo. Se for cálculo, mostre o passo a passo. \
            Restrinja-se a temas de IBS, CBS, Imposto Seletivo (IS) e transição tributária; para outros assuntos, informe que sua especialidade é a reforma tributária (LC 214/2025).

            --- BASE LEGAL ---
            A LC 214/2025 regulamenta a Emenda Constitucional nº 132/2023 e institui: (1) Imposto sobre Bens e Serviços (IBS), compartilhado entre União, estados, DF e municípios; \
            (2) Contribuição sobre Bens e Serviços (CBS), federal, que substitui PIS e COFINS; (3) Imposto Seletivo (IS), de caráter predominantemente extrafiscal.

            --- ESTRUTURA E PRINCÍPIOS ---
            Princípios: não cumulatividade plena, ampla base com seletividade, destino como critério de localização. Transparência, padronização nacional de obrigações acessórias, \
            neutralidade quanto às formas de organização e proibição de benefícios setoriais ou cumulatividade. \
            Alíquota de referência nacional: 26,5% (17,7% IBS + 8,8% CBS), definida pelo Senado; entes podem ajustar por lei, com limite de +1% para CBS seletiva. \
            Apuração mensal; compensação integral de créditos sobre aquisições de insumos, bens de capital e serviços; ressarcimento em até 60 dias (exportadores) ou 270 dias (demais), \
            com prioridade via mercado financeiro.

            --- FATO GERADOR E BASE DE CÁLCULO ---
            Fato gerador: fornecimento oneroso de bens (móveis/imóveis, tangíveis/intangíveis) e serviços de qualquer natureza (incl. locações, alienações fiduciárias, prestações sucessórias); \
            e, em casos não onerosos específicos, uso pessoal por sócios ou empregados. Base de cálculo: valor total da operação (frete, juros e despesas acessórias incluídos), \
            excluindo descontos incondicionais e os próprios IBS/CBS/IPI. Não incide sobre: livros, jornais, exportações, transferências internas entre estabelecimentos, rendas financeiras puras, \
            doações sem ônus, ITBI/ITCD. Imunidades constitucionais preservadas (templos, patrimônio histórico). Reduções de base/alíquota: cesta básica (zero ou 60% de redução), saúde, educação, \
            cultura, esportes, mobilidade urbana; cashback para famílias de baixa renda no CadÚnico (até 50% do salário mínimo).

            --- NÃO CUMULATIVIDADE E CRÉDITOS ---
            Não cumulatividade plena: todo contribuinte credita IBS/CBS pago nas aquisições antecedentes, independentemente de insumos produtivos; centralização em um único estabelecimento por PJ. \
            Crédito vedado para: bens de uso pessoal (veículos de luxo, joias, álcool, armas), aquisições no exterior sem industrialização, regimes monofásicos. \
            Ressarcimento: fórmula com 150% da média dos saldos credores dos últimos 24 meses, ajustada por sazonalidade e atividade; aceleração para exportações. \
            Split payment obrigatório em transações via plataformas digitais (retenção na liquidação financeira). 0,05% da arrecadação para programas de "cidadania fiscal".

            --- REGIMES ESPECIAIS ---
            Combustíveis: monofasia ad rem por litro/kg, crédito vedado na revenda; transição mantém ICMS diferencial. Setor financeiro, planos de saúde e apostas: incidência sobre margem de valor agregado ou GGR, alíquota uniforme nacional. \
            Imobiliário: redução de 20% na alíquota para empresas; redutor social de R$ 100 mil em residenciais novos (CIB). Turismo e hospitalidade: alíquotas ajustadas (bares, hotéis, transporte turístico); créditos limitados em insumos. \
            Compras governamentais: redução uniforme para neutralizar aumento de carga. Cooperativas de crédito e SAFs: desonerações para atos cooperativos e receitas essenciais; regimes como TEF preservados.

            --- IMPOSTO SELETIVO (IS) ---
            Natureza extrafiscal, monofásico. Incide sobre consumo de bens e serviços prejudiciais: veículos a combustão (alíquota crescente por emissões; zero em elétricos/híbridos sustentáveis), \
            tabaco (ad valorem + específico por unidade), bebidas alcoólicas (por teor), refrigerantes açucarados e minerais não energéticos (teto 1%). Base exclui IBS/CBS/IS; alíquotas por lei ordinária anual; não cumulatividade entre tributos seletivos.

            --- ADMINISTRAÇÃO ---
            CGIBS (Comitê Gestor Nacional do IBS): centraliza arrecadação e rateio (estados/DF: 100% até 2029, depois proporcional à população e IR per capita; municípios por coeficiente). \
            RFB administra CBS e IS; cadastro único (CPF/CNPJ/CIB); documento fiscal eletrônico nacional (DFEN). Comitê de Harmonização e Fórum Jurídico Permanente para uniformidade. \
            Penalidades: multa 0,33% ao dia (até 20%) por atraso; 75-225% por sonegação; programas de regularização incentivada.

            --- TRANSIÇÃO E VIGÊNCIA (2026-2033) ---
            2026: CBS 0,9%, IBS 0,1% (testes compensados por PIS/COFINS/ICMS). Progressão anual até 2033: 2027 (CBS 1,3%, IBS 0,1%) até 2032 (CBS 8,8%, IBS 17,7%). \
            Saldo credor de tributos antigos é aproveitado; REIDI, REPORTO, ZFM mantidos até 2032. Reequilíbrio de contratos públicos; teto à carga geral em 2035; avaliação quinquenal a partir de 2033. \
            Vigência majoritária em 2026, com vacatio legis para adaptações.
            """;
    }

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key:}")
    private String apiKey;

    /** Nome do modelo (ex.: gemini-2.5-flash). Deve ser um modelo que suporte generateContent na v1beta. */
    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    /**
     * Envia pergunta ao Gemini e retorna o texto da resposta.
     */
    public String consultar(String pergunta, String contexto) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key não configurada. Defina GEMINI_API_KEY ou gemini.api.key.");
            return "A consulta à IA não está disponível: chave da API Gemini não configurada. Configure a variável de ambiente GEMINI_API_KEY.";
        }
        String prompt = SYSTEM_CONTEXT + "\n\n";
        if (contexto != null && !contexto.isBlank()) {
            prompt += "Contexto: " + contexto + "\n\n";
        }
        prompt += "Pergunta: " + pergunta;

        try {
            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode contents = objectMapper.createArrayNode();
            ObjectNode content = objectMapper.createObjectNode();
            ArrayNode parts = objectMapper.createArrayNode();
            ObjectNode part = objectMapper.createObjectNode();
            part.put("text", prompt);
            parts.add(part);
            content.set("parts", parts);
            contents.add(content);
            body.set("contents", contents);

            String url = GEMINI_BASE + model + ":generateContent?key=" + apiKey;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode error = root.path("error");
                if (!error.isMissingNode()) {
                    String msg = error.path("message").asText("Erro desconhecido da API Gemini.");
                    log.warn("Gemini API error: {}", msg);
                    return "A API do Gemini retornou um erro: " + msg;
                }
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode responseContent = candidates.get(0).path("content");
                    JsonNode responseParts = responseContent.path("parts");
                    if (responseParts.isArray() && responseParts.size() > 0) {
                        return responseParts.get(0).path("text").asText("");
                    }
                }
                return "Resposta da IA não pôde ser processada.";
            }
            return "Resposta da IA não pôde ser processada.";
        } catch (org.springframework.web.client.RestClientException e) {
            log.error("Erro ao chamar Gemini (rede/API): {}", e.getMessage());
            return "Erro ao consultar a IA (verifique a chave e a conexão): " + e.getMessage();
        } catch (Exception e) {
            log.error("Erro ao consultar Gemini", e);
            return "Erro ao consultar a IA: " + e.getMessage();
        }
    }
}
