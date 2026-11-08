-- Toda escrita (insert ou update) ganha um novo seq da sequência global e
-- atualiza atualizado_em. O seq é o cursor da sincronização: o cliente pede
-- "tudo com seq maior que o último que eu vi".
CREATE OR REPLACE FUNCTION public.definir_seq_e_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.seq := nextval('public.sync_seq');
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.definir_seq_e_atualizado_em() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER cantinas_definir_seq BEFORE INSERT OR UPDATE ON public.cantinas FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER vendedores_definir_seq BEFORE INSERT OR UPDATE ON public.vendedores FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER clientes_definir_seq BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER produtos_definir_seq BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER dias_de_venda_definir_seq BEFORE INSERT OR UPDATE ON public.dias_de_venda FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER pedidos_definir_seq BEFORE INSERT OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER itens_pedido_definir_seq BEFORE INSERT OR UPDATE ON public.itens_pedido FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
CREATE TRIGGER pagamentos_definir_seq BEFORE INSERT OR UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.definir_seq_e_atualizado_em();
--> statement-breakpoint
-- O navegador nunca acessa o banco: além do RLS sem policies, as chaves
-- públicas do Supabase (anon e authenticated) não têm permissão nas tabelas.
-- A API do Next.js usa a conexão de servidor (DATABASE_URL), que não passa pelo RLS.
REVOKE ALL ON public.cantinas, public.vendedores, public.clientes, public.produtos, public.dias_de_venda, public.pedidos, public.itens_pedido, public.pagamentos FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE public.sync_seq FROM anon, authenticated;
