import { useRef, useState } from "react";
import { api } from "@/lib/api";

type MensagemIA = { role: "user" | "assistant"; texto: string };

type AiHelpTabProps = {
  onError: (msg: string | null) => void;
};

export default function AiHelpTab({ onError }: AiHelpTabProps) {
  const [mensagens, setMensagens] = useState<MensagemIA[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [loading, setLoading] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto) {
      onError("Digite sua pergunta.");
      return;
    }
    onError(null);
    setLoading(true);
    setPergunta("");
    setMensagens((prev) => [...prev, { role: "user", texto }]);
    try {
      const res = await api.post<{ sucesso?: boolean; resposta?: string; erro?: string | null }>(
        "/api/tributos/consulta-ia",
        { pergunta: texto }
      );
      const data = res.data;
      const resp =
        data?.sucesso === false && data?.erro
          ? data.erro
          : (data?.resposta ?? "Resposta não disponível. A consulta à IA ainda não está configurada no servidor.");
      setMensagens((prev) => [...prev, { role: "assistant", texto: resp }]);
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          role: "assistant",
          texto:
            "No momento a consulta à IA não está disponível. Revise as abas do simulador ou consulte seu contador.",
        },
      ]);
    } finally {
      setLoading(false);
      fimRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="tax-sim__card tax-sim__card--chat">
      <h2 className="tax-sim__card-title">Dúvidas sobre a Reforma Tributária</h2>
      <p className="tax-sim__card-desc">Converse com a IA quando disponível no servidor.</p>

      <div className="tax-sim__chat-area">
        {mensagens.length === 0 && (
          <p className="tax-sim__chat-empty">Escreva sua dúvida no campo abaixo e envie para a IA.</p>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`tax-sim__chat-msg tax-sim__chat-msg--${m.role}`}>
            <span className="tax-sim__chat-role">{m.role === "user" ? "Você" : "IA"}</span>
            <p>{m.texto}</p>
          </div>
        ))}
        {loading && (
          <div className="tax-sim__chat-msg tax-sim__chat-msg--assistant">
            <span className="tax-sim__chat-role">IA</span>
            <p className="tax-sim__typing">Pensando…</p>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <form onSubmit={(e) => void enviar(e)} className="tax-sim__chat-form">
        <textarea
          className="tax-sim__input tax-sim__textarea"
          rows={3}
          placeholder="Ex.: Como a reforma afeta meu preço de venda?"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn--primary" disabled={loading || !pergunta.trim()}>
          {loading ? "Enviando…" : "Perguntar"}
        </button>
      </form>
    </div>
  );
}
