-- precos_do_dia segue as regras das outras tabelas (ver 0001): seq e atualizado_em
-- preenchidos por trigger, e nenhuma permissão para as chaves públicas do Supabase.
CREATE TRIGGER precos_do_dia_definir_seq BEFORE INSERT OR UPDATE ON public.precos_do_dia FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
REVOKE ALL ON public.precos_do_dia FROM anon, authenticated;
