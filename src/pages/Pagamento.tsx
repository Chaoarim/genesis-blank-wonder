import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

const PIX_KEY = "consultapecasai@gmail.com";
const PRICE = "R$ 59,90";
const PIX_AMOUNT = "59.90";
const MERCHANT_NAME = "CONSULTA PECAS AI";
const MERCHANT_CITY = "SAO PAULO";

// EMV BR Code (Pix Copia e Cola) generator
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function buildPixPayload(): string {
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", PIX_KEY);
  const merchantAccount = tlv("26", gui + key);
  const payload =
    tlv("00", "01") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", PIX_AMOUNT) +
    tlv("58", "BR") +
    tlv("59", MERCHANT_NAME) +
    tlv("60", MERCHANT_CITY) +
    tlv("62", tlv("05", "***")) +
    "6304";
  return payload + crc16(payload);
}

const PIX_PAYLOAD = buildPixPayload();

export default function Pagamento() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_PAYLOAD);
      setCopied(true);
      toast({ title: "Pix Copia e Cola copiado!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const whatsappMsg = encodeURIComponent(
    `Olá Mauricio! ✅ Acabei de fazer o pagamento Pix de ${PRICE} para o AutoIQ.\n${email ? `Email: ${email}\n` : ""}Segue o comprovante anexo. Aguardo meu código de acesso.`
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Logo size={40} />
        <h1 className="text-2xl font-semibold">AutoIQ</h1>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-7 space-y-6">
        <div className="text-center">
          <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-medium mb-3">
            ✓ Cadastro recebido
          </div>
          <h2 className="text-xl font-semibold mb-1">Pagamento via Pix</h2>
          <p className="text-sm text-muted-foreground">
            Pague <strong>{PRICE}</strong> para liberar seu acesso.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 flex justify-center border border-border">
          <QRCodeSVG value={PIX_PAYLOAD} size={220} level="M" />
        </div>

        <div>
          <div className="flex items-stretch gap-2 bg-muted/40 border border-border rounded-xl p-2">
            <p className="flex-1 px-2 py-2 text-xs font-mono text-center break-all leading-relaxed text-foreground">
              {PIX_PAYLOAD}
            </p>
            <button
              onClick={copyKey}
              className="flex items-center gap-1.5 bg-background hover:bg-accent border border-border text-foreground text-sm font-medium px-3 rounded-lg transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Copie o código acima e cole na opção "Pix Copia e Cola" do seu banco, ou escaneie o QR Code.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">Como pagar:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
            <li>Abra o app do seu banco e escolha Pix → Pagar com chave</li>
            <li>Cole a chave (e-mail) acima ou escaneie o QR Code</li>
            <li>Confirme o valor de <strong>{PRICE}</strong></li>
            <li>Envie o comprovante pelo WhatsApp para liberarmos o acesso</li>
          </ol>
        </div>

        <a
          href={`https://wa.me/5519981878489?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Enviar comprovante por WhatsApp →
        </a>

        <p className="text-xs text-muted-foreground text-center">
          Liberação em até 1 hora útil após confirmação do pagamento.
        </p>
      </div>

      <Link to="/sales" className="mt-8 text-sm text-muted-foreground hover:text-foreground">
        ← Voltar para página inicial
      </Link>
    </div>
  );
}
