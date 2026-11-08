CREATE SEQUENCE "public"."sync_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "cantinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cantinas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dias_de_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"data" date NOT NULL,
	"nome" text,
	"fechado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dias_de_venda" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "itens_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"cantina_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"quantidade" integer NOT NULL,
	"preco_unitario_centavos" integer NOT NULL,
	"cancelado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "itens_pedido_quantidade_check" CHECK ("itens_pedido"."quantidade" > 0),
	CONSTRAINT "itens_pedido_preco_check" CHECK ("itens_pedido"."preco_unitario_centavos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "itens_pedido" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"cantina_id" uuid NOT NULL,
	"valor_centavos" integer NOT NULL,
	"forma" text NOT NULL,
	"vendedor_id" uuid,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"estornado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "pagamentos_valor_check" CHECK ("pagamentos"."valor_centavos" > 0),
	CONSTRAINT "pagamentos_forma_check" CHECK ("pagamentos"."forma" in ('dinheiro', 'pix'))
);
--> statement-breakpoint
ALTER TABLE "pagamentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"dia_id" uuid NOT NULL,
	"cliente_id" uuid,
	"origem" text DEFAULT 'balcao' NOT NULL,
	"status" text DEFAULT 'recebido' NOT NULL,
	"vendedor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "pedidos_origem_check" CHECK ("pedidos"."origem" in ('balcao', 'online')),
	CONSTRAINT "pedidos_status_check" CHECK ("pedidos"."status" in ('recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado'))
);
--> statement-breakpoint
ALTER TABLE "pedidos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "produtos_preco_centavos_check" CHECK ("produtos"."preco_centavos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "produtos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vendedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cantina_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dias_de_venda" ADD CONSTRAINT "dias_de_venda_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."vendedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_dia_id_dias_de_venda_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias_de_venda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."vendedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_cantina_id_cantinas_id_fk" FOREIGN KEY ("cantina_id") REFERENCES "public"."cantinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cantinas_slug_idx" ON "cantinas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cantinas_seq_idx" ON "cantinas" USING btree ("seq");--> statement-breakpoint
CREATE INDEX "clientes_cantina_seq_idx" ON "clientes" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "dias_de_venda_cantina_data_idx" ON "dias_de_venda" USING btree ("cantina_id","data");--> statement-breakpoint
CREATE INDEX "dias_de_venda_cantina_seq_idx" ON "dias_de_venda" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "itens_pedido_pedido_idx" ON "itens_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "itens_pedido_produto_idx" ON "itens_pedido" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "itens_pedido_cantina_seq_idx" ON "itens_pedido" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "pagamentos_pedido_idx" ON "pagamentos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pagamentos_vendedor_idx" ON "pagamentos" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "pagamentos_cantina_seq_idx" ON "pagamentos" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "pedidos_dia_idx" ON "pedidos" USING btree ("dia_id");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_idx" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "pedidos_vendedor_idx" ON "pedidos" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "pedidos_cantina_seq_idx" ON "pedidos" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "produtos_cantina_seq_idx" ON "produtos" USING btree ("cantina_id","seq");--> statement-breakpoint
CREATE INDEX "vendedores_cantina_seq_idx" ON "vendedores" USING btree ("cantina_id","seq");