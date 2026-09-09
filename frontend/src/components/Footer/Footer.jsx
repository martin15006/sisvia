import { MARCA, ORGANIZACION } from '../../lib/marca.js';
import './Footer.css';

// Pie de pagina neutro: la marca del PRODUCTO a la izquierda y el nombre de la
// ORGANIZACION que lo usa a la derecha. Sin logos de terceros: si un cliente
// quiere el suyo, se cambia ORGANIZACION y se sube su logo a /public.
function Footer() {
    return (
        <footer className='footer'>
            <div className='footer-marca'>
                <img src={MARCA.logo} alt={MARCA.nombre} className='footer-logo' />
                <span className='footer-nombre'>{MARCA.nombre}</span>
            </div>
            <p className='footer-texto'>
                {MARCA.lema} · {ORGANIZACION}
            </p>
        </footer>
    );
}

export default Footer;
