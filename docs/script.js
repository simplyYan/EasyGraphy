document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    const toggleTheme = () => {
        body.classList.toggle('dark-theme');
        if (body.classList.contains('dark-theme')) {
            themeToggleBtn.textContent = '🌙 Dark Theme';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggleBtn.textContent = '🔆 Light Theme';
            localStorage.setItem('theme', 'light');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        themeToggleBtn.textContent = '🌙 Dark Theme';
    } else {
        themeToggleBtn.textContent = '🔆 Light Theme';
    }

    themeToggleBtn.addEventListener('click', toggleTheme);

    const textToArrayBuffer = (text) => {
        return new TextEncoder().encode(text);
    };

    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        bytes.forEach((b) => binary += String.fromCharCode(b));
        return window.btoa(binary);
    };

    const base64ToArrayBuffer = (base64) => {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const deriveKey = async (password, salt) => {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    };

    const encryptText = async (plaintext, password) => {
        try {
            if (password.length < 4 || password.length > 32) {
                alert('The keyword must be between 4 and 32 characters long.');
                return;
            }

            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const key = await deriveKey(password, salt);
            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                textToArrayBuffer(plaintext)
            );

            const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.byteLength);
            combined.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

            return arrayBufferToBase64(combined.buffer);
        } catch (error) {
            console.error(error);
            alert('Error encrypting text.');
        }
    };

    const decryptText = async (ciphertextBase64, password) => {
        try {
            const combined = base64ToArrayBuffer(ciphertextBase64);
            const combinedBytes = new Uint8Array(combined);

            const salt = combinedBytes.slice(0, 16);
            const iv = combinedBytes.slice(16, 28);
            const ciphertext = combinedBytes.slice(28);

            const key = await deriveKey(password, salt);
            const plaintextBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                ciphertext
            );

            const decoder = new TextDecoder();
            return decoder.decode(plaintextBuffer);
        } catch (error) {
            console.error(error);
            alert('Error decrypting the text. Check that the password is correct.');
        }
    };

    const encryptBtn = document.getElementById('encrypt-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    const copyBtn = document.getElementById('copy-btn');
    const saveBtn = document.getElementById('save-btn');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const passwordInput = document.getElementById('password');

    encryptBtn.addEventListener('click', async () => {
        const plaintext = inputText.value.trim();
        const password = passwordInput.value;
        if (!plaintext) {
            alert('Please enter the text to encrypt.');
            return;
        }
        if (password.length < 4 || password.length > 32) {
            alert('The keyword must be between 4 and 32 characters long.');
            return;
        }
        const encrypted = await encryptText(plaintext, password);
        if (encrypted) {
            outputText.value = encrypted;
        }
    });

    decryptBtn.addEventListener('click', async () => {
        const ciphertext = inputText.value.trim();
        const password = passwordInput.value;
        if (!ciphertext) {
            alert('Please enter the text to decrypt.');
            return;
        }
        if (password.length < 4 || password.length > 32) {
            alert('The keyword must be between 4 and 32 characters long.');
            return;
        }
        const decrypted = await decryptText(ciphertext, password);
        if (decrypted !== undefined) {
            outputText.value = decrypted;
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = outputText.value;
        if (!text) {
            alert('There is no text to copy.');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            alert('Text copied to the clipboard!');
        }).catch(err => {
            console.error(err);
            alert('Error copying text.');
        });
    });

    saveBtn.addEventListener('click', () => {
        const text = outputText.value;
        if (!text) {
            alert('No text to save.');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'EasyGraphy_Text.txt';
        a.click();
        URL.revokeObjectURL(url);
    });
});