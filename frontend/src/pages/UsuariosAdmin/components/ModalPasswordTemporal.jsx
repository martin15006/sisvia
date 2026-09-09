import { useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import './ModalPasswordTemporal.css';

function ModalPasswordTemporal({
    abierto,
    onCerrar,
    password,
    email,
    nombreUsuario,
}) {
    const [copiado, setCopiado] = useState(false);

    const copiarPassword = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (err) {
            alert('No se pudo copiar al portapapeles');
        }
    };

    return (
        <Modal abierto={abierto} onCerrar={onCerrar} titulo='Contraseña generada'>
            <div className="password-modal">
                <div className="password-modal-icono">
                    <img src="/logo.png" alt='SISVIA' />
                </div>
                <p className="password-modal-mensaje">
                    Se generó una contraseña temporal{' '}
                    {nombreUsuario && (
                        <>
                            para <strong>{nombreUsuario}</strong>
                        </>
                    )}
                    . Entrégala al usuario; deberá cambiarla al iniciar sesión.
                </p>

                {email && (
                    <div className="password-modal-campo">
                        <div className="password-modal-label">Correo</div>
                        <div className="password-modal-valor">{email}</div>
                    </div>
                )}

                <div className="password-modal-campo">
                    <div className="password-modal-label">Contraseña temporal</div>
                    <div className="password-modal-valor password-modal-password">
                        <code>{password}</code>
                        <button
                            type='button'
                            className={`password-modal-copiar ${copiado ? 'copiado' : ''}`}
                            onClick={copiarPassword}
                        >
                            {copiado ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>

                <div className='password-modal-advertencia'>
                    Esta es la única vez que se muestra. Si la pierdes, hay que resetearla de nuevo
                </div>
                <button className="password-modal-aceptar" onClick={onCerrar}>
                    Entendido
                </button>
            </div>
        </Modal>
    );
}

export default ModalPasswordTemporal;