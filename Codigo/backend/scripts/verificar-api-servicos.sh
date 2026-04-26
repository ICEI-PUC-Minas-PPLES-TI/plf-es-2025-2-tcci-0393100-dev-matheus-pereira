#!/usr/bin/env bash
# =============================================================================
# Script: Verifica se a API de serviços retorna os dados corretamente
# Uso: ./verificar-api-servicos.sh   (backend em http://localhost:8080)
# Confirma o formato da resposta para validar se o front está correto.
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "1. Fazendo login em $BASE_URL/api/auth/login ..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login":"josecarlos","senha":"484659"}')

TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "ERRO: Login falhou ou resposta sem token."
  echo "$LOGIN_RESP"
  exit 1
fi
echo "   Login OK. Token obtido."

echo ""
echo "2. Chamando GET $BASE_URL/api/servicos ..."
SERVICOS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/servicos")
COUNT=$(echo "$SERVICOS_RESP" | grep -o '"servicoId"' | wc -l)
echo "   Total de itens no array: $COUNT"

echo ""
echo "3. Resposta bruta (JSON) para o front conferir:"
echo "$SERVICOS_RESP" | python -m json.tool 2>/dev/null || echo "$SERVICOS_RESP"

echo ""
echo "4. O front deve:"
echo "   - Chamar GET $BASE_URL/api/servicos"
echo "   - Enviar header: Authorization: Bearer <token>"
echo "   - Tratar a resposta como array de objetos com: servicoId, nome, descricao, valorPadrao, ativo"
