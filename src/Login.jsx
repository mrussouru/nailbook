import logo from './assets/logo.png'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { cargarUsuario } from "./motores/auth";
import { useUsuario } from "./context/UsuarioContext";

export default function Login({ children }) {
  const [session, setSession] = useState(null)
  const { usuario, setUsuario } = useUsuario();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {

      setSession(data.session);
    
      if (data.session) {
    
        const usuarioBD = await cargarUsuario();
    
        setUsuario(usuarioBD);
        
    
      }
    
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

if (session) {

  const usuarioBD = await cargarUsuario();

  setUsuario(usuarioBD);
 

} else {

  setUsuario(null);

}
    })

    return () => subscription.unsubscribe()
  }, [])

  async function ingresar() {
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
  }

  if (session) return children

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      justifyContent:'center',
      alignItems:'center',
      background:'#fdf6f8'
    }}>
      <div style={{
        background:'#fff',
        padding:30,
        width:340,
        borderRadius:20,
        border:'2px solid #f0d9e8'
      }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
  <img
    src={logo}
    alt="Tamy Ayelen"
    style={{
      width:150,
      marginBottom:12
    }}
  />
</div>

        <h2 style={{
          marginTop: 20,
          marginBottom: 6,
          color: '#b05080',
          fontSize: 24
        }}>
        Panel interno
        </h2>

        <p style={{
          color: '#777',
          marginBottom: 24,
          fontSize: 14
        }}>
        Ingresá con tu usuario y contraseña
        </p>

        <input
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{width:'100%',padding:10,marginBottom:10}}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          style={{width:'100%',padding:10}}
        />

        <button
          onClick={ingresar}
          style={{
            width:'100%',
            marginTop:20,
            padding:10,
            background:'#b05080',
            color:'#fff',
            border:'none',
            borderRadius:10
          }}
        >
          Ingresar
        </button>

        {error && (
          <p style={{color:'red'}}>
            {error}
          </p>
        )}

      </div>
    </div>
  )
}