CREATE TABLE "precos_do_dia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"dia_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"preco_centavos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "precos_do_dia_preco_centavos_check" CHECK ("precos_do_dia"."preco_centavos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "precos_do_dia" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "dias_de_venda_cantina_data_idx";--> statement-breakpoint
ALTER TABLE "dias_de_venda" ADD COLUMN "cancelado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entregue_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "precos_do_dia" ADD CONSTRAINT "precos_do_dia_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precos_do_dia" ADD CONSTRAINT "precos_do_dia_dia_id_dias_de_venda_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias_de_venda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precos_do_dia" ADD CONSTRAINT "precos_do_dia_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "precos_do_dia_dia_produto_idx" ON "precos_do_dia" USING btree ("dia_id","produto_id");--> statement-breakpoint
CREATE INDEX "precos_do_dia_produto_idx" ON "precos_do_dia" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "precos_do_dia_cantina_seq_idx" ON "precos_do_dia" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "dias_de_venda_cantina_data_idx" ON "dias_de_venda" USING btree ("cantina_id","data");