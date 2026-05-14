import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function createAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('Provisionando Admin...')

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'suporteti@globalp.com.br',
      password: 'Globaltipwd',
      email_confirm: true,
      user_metadata: {
        full_name: 'Suporte TI Admin',
        role: 'super_admin'
      }
    })

    if (error) {
      console.log('Mensagem de erro:', error.message)
      if (error.message.includes('already exists')) {
        console.log('Usuário já existe, atualizando...')
        // Tentar atualizar
        const { data: list } = await supabase.auth.admin.listUsers()
        const user = list?.users.find(u => u.email === 'suporteti@globalp.com.br')
        if (user) {
          await supabase.auth.admin.updateUserById(user.id, { password: 'Globaltipwd' })
          console.log('✅ Atualizado!')
        }
      }
    } else {
      console.log('✅ Criado!')
    }
  } catch (e) {
    console.error('Erro fatal:', e)
  }
}

createAdmin()
