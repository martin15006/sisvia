import { MARCA } from '../../lib/marca.js';
import { useAuth } from '../../hooks/useAuth.js';
import { nombreOrganizacion } from '../../lib/organizacion.js';
import './Footer.css';

// Pie de pagina neutro: la marca del PRODUCTO a la izquierda y el nombre de la
// ORGANIZACION que lo usa a la derecha: la empresa del usuario (HU-08.1).
function Footer() {
    const { usuario, empresaActiva } = useAuth();
    const organizacion = nombreOrganizacion(usuario, empresaActiva);
    return (
        <footer className='footer'>
            <div className='footer-marca'>
                <img src={MARCA.logo} alt={MARCA.nombre} className='footer-logo' />
                <span className='footer-nombre'>{MARCA.nombre}</span>
            </div>
            <p className='footer-texto'>
                {MARCA.lema}{organizacion ? ` · ${organizacion}` : ''}
            </p>
        </footer>
    );
}

export default Footer;
