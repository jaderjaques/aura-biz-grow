-- Garantir que Admin pode fazer tudo com produtos
DROP POLICY IF EXISTS "Admin manage products" ON products;
DROP POLICY IF EXISTS "Users view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Admins podem fazer tudo com produtos
CREATE POLICY "Admin manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.name = 'Administrador'
    )
  );

-- Todos usuários autenticados podem visualizar produtos
CREATE POLICY "Users view products"
  ON products FOR SELECT
  USING (auth.uid() IS NOT NULL);