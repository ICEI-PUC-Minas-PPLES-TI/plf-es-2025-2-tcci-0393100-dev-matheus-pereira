package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ClienteDTO;
import com.pucminas.sgi.dto.response.ClienteResponseDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.DuplicateResourceException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço de clientes: CRUD, saldo devedor e status.
 */
@Service
public class ClienteService {

    private static final Logger log = LoggerFactory.getLogger(ClienteService.class);

    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final DividaService dividaService;

    public ClienteService(ClienteRepository clienteRepository, DividaRepository dividaRepository,
                          DividaService dividaService) {
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.dividaService = dividaService;
    }

    @Transactional
    public ClienteResponseDTO cadastrarCliente(ClienteDTO dto) {
        normalizarDto(dto);
        if (clienteRepository.findByCpfCnpj(dto.getCpfCnpj()).isPresent()) {
            throw new DuplicateResourceException("CPF/CNPJ já cadastrado");
        }
        Cliente c = Cliente.builder()
                .nome(dto.getNome().trim())
                .cpfCnpj(dto.getCpfCnpj())
                .email(dto.getEmail())
                .telefone(dto.getTelefone())
                .celular(dto.getCelular())
                .endereco(dto.getEndereco())
                .statusCliente(dto.getStatusCliente() != null ? dto.getStatusCliente() : StatusCliente.ATIVO)
                .saldoDevedor(dto.getSaldoDevedor() != null ? dto.getSaldoDevedor() : BigDecimal.ZERO)
                .criadoEm(LocalDateTime.now())
                .atualizadoEm(LocalDateTime.now())
                .build();
        c = clienteRepository.save(c);
        log.info("Cliente cadastrado: {} - {}", c.getClienteId(), c.getNome());
        return toResponse(c);
    }

    @Transactional
    public ClienteResponseDTO atualizarCliente(UUID clienteId, ClienteDTO dto) {
        normalizarDto(dto);
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        clienteRepository.findByCpfCnpj(dto.getCpfCnpj()).ifPresent(outro -> {
            if (!outro.getClienteId().equals(clienteId)) {
                throw new DuplicateResourceException("CPF/CNPJ já cadastrado para outro cliente");
            }
        });
        c.setNome(dto.getNome().trim());
        c.setCpfCnpj(dto.getCpfCnpj());
        c.setEmail(dto.getEmail());
        c.setTelefone(dto.getTelefone());
        c.setCelular(dto.getCelular());
        c.setEndereco(dto.getEndereco());
        if (dto.getStatusCliente() != null) c.setStatusCliente(dto.getStatusCliente());
        c = clienteRepository.save(c);
        return toResponse(c);
    }

    /** Atualização parcial (PATCH). Com {@code nome} + {@code cpfCnpj} no body, trata como
     *  salvamento do modal e substitui campos opcionais (omitidos ou vazios viram {@code null}). */
    @Transactional
    public ClienteResponseDTO atualizarClientePartial(UUID clienteId, ClienteDTO dto) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));

        if (dto.getNome() != null && dto.getCpfCnpj() != null) {
            aplicarSalvamentoCompleto(c, clienteId, dto);
        } else {
            aplicarPatchParcial(c, clienteId, dto);
        }

        c = clienteRepository.save(c);
        return toResponse(c);
    }

    private void aplicarSalvamentoCompleto(Cliente c, UUID clienteId, ClienteDTO dto) {
        c.setNome(dto.getNome().trim());
        String cpfCnpj = TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj());
        clienteRepository.findByCpfCnpj(cpfCnpj).ifPresent(outro -> {
            if (!outro.getClienteId().equals(clienteId)) {
                throw new DuplicateResourceException("CPF/CNPJ já cadastrado para outro cliente");
            }
        });
        c.setCpfCnpj(cpfCnpj);
        c.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        c.setTelefone(normalizarTelefoneFixo(dto.getTelefone()));
        c.setCelular(normalizarCelular(dto.getCelular()));
        c.setEndereco(normalizarEndereco(dto.getEndereco()));
        if (dto.getStatusCliente() != null) {
            c.setStatusCliente(dto.getStatusCliente());
        }
    }

    private void aplicarPatchParcial(Cliente c, UUID clienteId, ClienteDTO dto) {
        if (dto.getNome() != null) c.setNome(dto.getNome().trim());
        if (dto.getCpfCnpj() != null) {
            String cpfCnpj = TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj());
            clienteRepository.findByCpfCnpj(cpfCnpj).ifPresent(outro -> {
                if (!outro.getClienteId().equals(clienteId)) {
                    throw new DuplicateResourceException("CPF/CNPJ já cadastrado para outro cliente");
                }
            });
            c.setCpfCnpj(cpfCnpj);
        }
        if (dto.getEmail() != null) {
            c.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        }
        if (dto.getTelefone() != null) {
            c.setTelefone(normalizarTelefoneFixo(dto.getTelefone()));
        }
        if (dto.getCelular() != null) {
            c.setCelular(normalizarCelular(dto.getCelular()));
        }
        if (dto.getEndereco() != null) {
            c.setEndereco(normalizarEndereco(dto.getEndereco()));
        }
        if (dto.getStatusCliente() != null) c.setStatusCliente(dto.getStatusCliente());
    }

    private static String normalizarTelefoneFixo(String telefone) {
        String normalizado = TelefoneClienteUtil.normalizarOpcional(telefone);
        TelefoneClienteUtil.validarTelefoneFixo(normalizado);
        return normalizado;
    }

    private static String normalizarCelular(String celular) {
        String normalizado = TelefoneClienteUtil.normalizarOpcional(celular);
        TelefoneClienteUtil.validarCelular(normalizado);
        return normalizado;
    }

    private static String normalizarEndereco(String endereco) {
        if (endereco == null) {
            return null;
        }
        String trimmed = endereco.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Exclusão lógica: marca cliente como INATIVO. */
    @Transactional
    public void excluirCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        c.setStatusCliente(StatusCliente.INATIVO);
        clienteRepository.save(c);
        log.info("Cliente desativado (soft delete): {}", clienteId);
    }

    @Transactional(readOnly = true)
    public ClienteResponseDTO consultarCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> listarClientes(String nome, StatusCliente status, Pageable pageable) {
        String nomeFiltro = (nome != null && !nome.isBlank()) ? nome.trim() : null;
        if (nomeFiltro != null && status != null) {
            return clienteRepository.findByNomeContainingIgnoreCaseAndStatusCliente(nomeFiltro, status, pageable).map(this::toResponse);
        }
        if (nomeFiltro != null) {
            return clienteRepository.findByNomeContainingIgnoreCase(nomeFiltro, pageable).map(this::toResponse);
        }
        if (status != null) {
            return clienteRepository.findByStatusCliente(status, pageable).map(this::toResponse);
        }
        return clienteRepository.findAll(pageable).map(this::toResponse);
    }

    /**
     * Calcula o saldo devedor do cliente (soma das dívidas em aberto ou parcial).
     */
    @Transactional(readOnly = true)
    public BigDecimal calcularSaldoDevedor(UUID clienteId) {
        return dividaRepository.sumValorDevedorByClienteId(clienteId,
                List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.VENCIDA));
    }

    /**
     * Atualiza o saldo devedor e o status do cliente com base nas dívidas.
     * Chamado via ClienteStatusUpdateListener (após commit) para evitar SQLITE_BUSY.
     */
    @Transactional
    public void atualizarStatusCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        BigDecimal saldo = calcularSaldoDevedor(clienteId);
        c.setSaldoDevedor(saldo);
        c.setStatusCliente(saldo.compareTo(BigDecimal.ZERO) == 0 ? StatusCliente.ATIVO : StatusCliente.ATIVO);
        clienteRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<DividaResponseDTO> listarDividasPorCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        return dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .map(dividaService::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClienteResponseDTO> rankingMaioresDevedores(int limite) {
        List<Cliente> top = clienteRepository.findTop10ByOrderBySaldoDevedorDesc();
        if (limite > 0 && limite < top.size()) {
            top = top.subList(0, limite);
        }
        return top.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private ClienteResponseDTO toResponse(Cliente c) {
        return ClienteResponseDTO.builder()
                .clienteId(c.getClienteId())
                .nome(c.getNome())
                .cpfCnpj(c.getCpfCnpj())
                .email(c.getEmail())
                .telefone(c.getTelefone())
                .celular(c.getCelular())
                .endereco(c.getEndereco())
                .statusCliente(c.getStatusCliente())
                .saldoDevedor(centavosParaReais(c.getSaldoDevedor()))
                .criadoEm(c.getCriadoEm())
                .atualizadoEm(c.getAtualizadoEm())
                .build();
    }

    private static void normalizarDto(ClienteDTO dto) {
        if (dto.getCpfCnpj() != null) {
            dto.setCpfCnpj(TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj()));
        }
        dto.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        dto.setTelefone(TelefoneClienteUtil.normalizarOpcional(dto.getTelefone()));
        dto.setCelular(TelefoneClienteUtil.normalizarOpcional(dto.getCelular()));
        if (dto.getEndereco() != null) {
            String endereco = dto.getEndereco().trim();
            dto.setEndereco(endereco.isEmpty() ? null : endereco);
        }
        TelefoneClienteUtil.validarContatos(dto.getTelefone(), dto.getCelular());
    }

    private static BigDecimal centavosParaReais(BigDecimal centavos) {
        return centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
