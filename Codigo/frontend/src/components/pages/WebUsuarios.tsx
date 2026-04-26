import { useCallback, useMemo, type SyntheticEvent } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import WebCadastrosPendentes from "./WebCadastrosPendentes";
import WebUsuariosAtivos from "./WebUsuariosAtivos";

type Aba = "pendentes" | "ativos";

const ABA_KEY = "aba";
const ABA_ATIVOS = "ativos";

function parseAba(raw: string | null): Aba {
  return raw === ABA_ATIVOS ? "ativos" : "pendentes";
}

export default function WebUsuarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = useMemo(
    () => parseAba(searchParams.get(ABA_KEY)),
    [searchParams]
  );

  const setAba = useCallback(
    (_: SyntheticEvent, value: Aba) => {
      if (value === "pendentes") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ [ABA_KEY]: ABA_ATIVOS }, { replace: true });
      }
    },
    [setSearchParams]
  );

  return (
    <Box className="page-usuarios" sx={{ maxWidth: "100%", pb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Gestão de usuários
      </Typography>
      <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 700, mb: 2 }}>
        Usuários
      </Typography>

      <Tabs
        value={aba}
        onChange={setAba}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
        aria-label="Seções de usuários"
      >
        <Tab label="Cadastros pendentes" value="pendentes" id="tab-usuarios-pendentes" />
        <Tab label="Contas ativas" value="ativos" id="tab-usuarios-ativos" />
      </Tabs>

      <Box role="tabpanel" id={`panel-usuarios-${aba}`} aria-labelledby={`tab-usuarios-${aba === "pendentes" ? "pendentes" : "ativos"}`}>
        {aba === "pendentes" ? <WebCadastrosPendentes embedded /> : <WebUsuariosAtivos embedded />}
      </Box>
    </Box>
  );
}
