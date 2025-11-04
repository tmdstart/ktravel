// ConceptMainPage.jsx (로직과 구조 전용) - 인증 방식 수정됨

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Concept_MainPage.css'; // 외부 CSS 파일만 import
import { AiFillMessage } from 'react-icons/ai';
import Sidebar from '../components/Sidebar';


const ConceptCard = ({ title, subTitle, icon: Icon, colorClass, destination,children }) => (
    <Link 
        to={destination}
        // 배경, hover 효과를 담당하는 클래스를 Link에 적용
        className={`concept-card-link ${colorClass}`} 
    >
        <div className="concept-card-content"> 
            <h3 className="card-title">{title}</h3>
            <p className="card-subtitle">{subTitle}</p>
            <div className="card-icon-wrapper">
            </div>
        </div>
        {children}
    </Link>
);

const ConceptMainPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // ************************
    // 로그인/상태 관리 로직
    // ************************
    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                setIsLoggedIn(false);
                return;
            }

            const response = await fetch('http://localhost:8000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setIsLoggedIn(true);
                setCurrentUser(userData);
            } else {
                // 세션이 만료되었거나 유효하지 않음
                localStorage.removeItem('session_id');
                setIsLoggedIn(false);
            }
        } catch (err) {
            localStorage.removeItem('session_id');
            setIsLoggedIn(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const responseData = await response.json();
            
            // session_id를 localStorage에 저장
            if (responseData.session_id) {
                localStorage.setItem('session_id', responseData.session_id);
                
                if (rememberMe) {
                    localStorage.setItem('user', JSON.stringify(responseData.user));
                }

                setIsLoggedIn(true);
                setCurrentUser(responseData.user);
                setFormData({ username: '', password: '' });
            } else {
                throw new Error('로그인 응답에 session_id가 없습니다.');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const sessionId = localStorage.getItem('session_id');
            
            if (sessionId) {
                await fetch('http://localhost:8000/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionId}`
                    }
                });
            }

            localStorage.removeItem('session_id');
            localStorage.removeItem('user');
            setIsLoggedIn(false);
            setCurrentUser(null);
        } catch (err) {
            console.error('Logout error:', err);
            // 에러가 나도 로컬 상태는 정리
            localStorage.removeItem('session_id');
            localStorage.removeItem('user');
            setIsLoggedIn(false);
            setCurrentUser(null);
        }
    };
    // ************************
    
    return (
        <>
            {/* Sidebar는 컴포넌트 내부에서 위치를 잡습니다. */}
            {isLoggedIn && <Sidebar />}
            
            {/* 인라인 스타일 제거: .login-page-container 클래스에 transition 및 margin-left 속성 적용 */}
            <div className="login-page-container">
                
                <div className="main-content-area">
                    <header className="page-header">
                        <p className="header-title">✈ K-Guidance</p>
                        
                        {/* 로그인 후 사용자 정보: 인라인 스타일 제거, 클래스 적용 */}
                        {isLoggedIn && currentUser && (
                            <div className="user-info-display">
                                <span className="user-text">
                                    👤 {currentUser.username || currentUser.name}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="logout-button"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </header>

                    <section className="welcome-section">
                        <h2 className="welcome-title fade-in-text fade-in-delay-1"> 
                            <svg 
                                        width="50" height="50" 
                                        viewBox="0 0 24 24" fill="none" 
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="flight-icon" /* 👈 CSS 스타일링을 위해 클래스 추가 */
                                    >
                                        <path d="M17.7448 2.81298C18.7095 1.8165 20.3036 1.80361 21.2843 2.78436C22.2382 3.73823 22.2559 5.27921 21.3243 6.25481L18.5456 9.16457C18.3278 9.39265 18.219 9.50668 18.1518 9.64024C18.0924 9.75847 18.0571 9.88732 18.0478 10.0193C18.0374 10.1684 18.0728 10.3221 18.1438 10.6293L19.8717 18.1169C19.9444 18.4323 19.9808 18.59 19.9691 18.7426C19.9587 18.8776 19.921 19.0091 19.8582 19.1291C19.7873 19.2647 19.6729 19.3792 19.444 19.608L19.0732 19.9788C18.4671 20.585 18.164 20.888 17.8538 20.9429C17.583 20.9908 17.3043 20.925 17.0835 20.761C16.8306 20.5733 16.695 20.1666 16.424 19.3534L14.4142 13.3241L11.0689 16.6695C10.8692 16.8691 10.7694 16.969 10.7026 17.0866C10.6434 17.1907 10.6034 17.3047 10.5846 17.423C10.5633 17.5565 10.5789 17.6968 10.61 17.9775L10.7937 19.6309C10.8249 19.9116 10.8405 20.0519 10.8192 20.1854C10.8004 20.3037 10.7604 20.4177 10.7012 20.5219C10.6344 20.6394 10.5346 20.7393 10.3349 20.939L10.1374 21.1365C9.66434 21.6095 9.42781 21.8461 9.16496 21.9146C8.93442 21.9746 8.68999 21.9504 8.47571 21.8463C8.2314 21.7276 8.04585 21.4493 7.67475 20.8926L6.10643 18.5401C6.04013 18.4407 6.00698 18.391 5.96849 18.3459C5.9343 18.3058 5.89701 18.2685 5.85694 18.2343C5.81184 18.1958 5.76212 18.1627 5.66267 18.0964L3.31018 16.5281C2.75354 16.157 2.47521 15.9714 2.35649 15.7271C2.25236 15.5128 2.22816 15.2684 2.28824 15.0378C2.35674 14.775 2.59327 14.5385 3.06633 14.0654L3.26384 13.8679C3.46352 13.6682 3.56337 13.5684 3.68095 13.5016C3.78511 13.4424 3.89906 13.4024 4.01736 13.3836C4.15089 13.3623 4.29123 13.3779 4.5719 13.4091L6.22529 13.5928C6.50596 13.6239 6.6463 13.6395 6.77983 13.6182C6.89813 13.5994 7.01208 13.5594 7.11624 13.5002C7.23382 13.4334 7.33366 13.3336 7.53335 13.1339L10.8787 9.7886L4.84939 7.77884C4.03616 7.50776 3.62955 7.37222 3.44176 7.11932C3.27777 6.89848 3.212 6.61984 3.2599 6.34898C3.31477 6.03879 3.61784 5.73572 4.22399 5.12957L4.59476 4.7588C4.82365 4.52991 4.9381 4.41546 5.07369 4.34457C5.1937 4.28183 5.3252 4.24411 5.46023 4.23371C5.61278 4.22197 5.77049 4.25836 6.0859 4.33115L13.545 6.05249C13.855 6.12401 14.01 6.15978 14.1596 6.14914C14.3041 6.13886 14.4446 6.09733 14.5714 6.02742C14.7028 5.95501 14.8134 5.84074 15.0347 5.6122L17.7448 2.81298Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    </h2>
                                    <h2 className="welcome-title fade-in-text fade-in-delay-1">
                            K-Travel
                        </h2>
                        <h2 className="welcome-title fade-in-text fade-in-delay-1">
                           <p>
     with <span class="glow-k">K</span> - Chat <span class="glow-ai">AI </span>

                            <svg width="4%" height="4%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M10 15L6.92474 18.1137C6.49579 18.548 6.28131 18.7652 6.09695 18.7805C5.93701 18.7938 5.78042 18.7295 5.67596 18.6076C5.55556 18.4672 5.55556 18.162 5.55556 17.5515V15.9916C5.55556 15.444 5.10707 15.0477 4.5652 14.9683V14.9683C3.25374 14.7762 2.22378 13.7463 2.03168 12.4348C2 12.2186 2 11.9605 2 11.4444V6.8C2 5.11984 2 4.27976 2.32698 3.63803C2.6146 3.07354 3.07354 2.6146 3.63803 2.32698C4.27976 2 5.11984 2 6.8 2H14.2C15.8802 2 16.7202 2 17.362 2.32698C17.9265 2.6146 18.3854 3.07354 18.673 3.63803C19 4.27976 19 5.11984 19 6.8V11M19 22L16.8236 20.4869C16.5177 20.2742 16.3647 20.1678 16.1982 20.0924C16.0504 20.0255 15.8951 19.9768 15.7356 19.9474C15.5558 19.9143 15.3695 19.9143 14.9969 19.9143H13.2C12.0799 19.9143 11.5198 19.9143 11.092 19.6963C10.7157 19.5046 10.4097 19.1986 10.218 18.8223C10 18.3944 10 17.8344 10 16.7143V14.2C10 13.0799 10 12.5198 10.218 12.092C10.4097 11.7157 10.7157 11.4097 11.092 11.218C11.5198 11 12.0799 11 13.2 11H18.8C19.9201 11 20.4802 11 20.908 11.218C21.2843 11.4097 21.5903 11.7157 21.782 12.092C22 12.5198 22 13.0799 22 14.2V16.9143C22 17.8462 22 18.3121 21.8478 18.6797C21.6448 19.1697 21.2554 19.5591 20.7654 19.762C20.3978 19.9143 19.9319 19.9143 19 19.9143V22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </svg> </p>
                        </h2>
{/*Welcome! We are K-Guidance, a dedicated travel platform for foreign visitors.
                            We specialize in curating and recommending the best travel routes across Korea.*/}
                        <p className="welcome-text fade-in-text fade-in-delay-3">
                            Generate Your Ultimate Korea Itinerary in Seconds. <br />
                        </p>
                    </section>

                    <section className="concept-selection">
                        <h3 className="concept-prompt fade-in-text fade-in-delay-4"> Please choose your travel concept ✔</h3>
                        <div className="concept-cards-grid fade-in-text fade-in-delay-5">
                        <ConceptCard 
                                    title="Tourist attractions" 
                                    subTitle="We introduce various famous places in Korea."
                                    colorClass="card-kpop-demon"
                                    destination="/chatbot/demon-hunters"
                                >
                                    {/* 자식 요소는 태그 사이에 위치합니다. */}
                                    <div className="card-description">
                                    <p>
                                        Hello there! I'm your travel guide chatbot, here to introduce you to 
                                        <strong> Korea's most exciting attractions and hidden charms</strong>!<br />
                                        From iconic landmarks to secret spots loved by locals, 
                                        I'll help you discover the true beauty of Korea.<br />
                                        Are you ready to start your unforgettable Korean adventure with me? ✈️🌏
                                    </p>                       
                                </div>
                                </ConceptCard>

                                <ConceptCard 
                                    title="K-POP STAR" 
                                    subTitle="Experience the glamorous life of a K-Pop idol."
                                    colorClass="card-kpop-star"
                                    destination="/chatbot/kpop-star"
                                >
                                    <div className="card-description">
                                        <p>
        Hello <strong>K-pop fans!🎤🎶</strong><br />
        Explore <strong>Seoul’s top entertainment companies, celebrity hangouts,</strong><br />
        and iconic <strong>K-pop spots</strong>.<br />
        Follow your idols’ footsteps and <strong>start your journey!</strong>
    </p>
                                            
                                    </div>
                                </ConceptCard>
                                                
                            <ConceptCard 
                                title="K-FOOD" 
                                subTitle="Explore Korea through its delicious culinary journey."
                                colorClass="card-kfood"
                                destination="/chatbot/k-food"
                                >
                                             <div className="card-description">
                                       <p>
    Hello <strong>food lovers!🍜</strong><br />
    Taste the best of <strong>Korean cuisine</strong>, from street snacks to gourmet dishes.<br />
    Visit <strong>korea restaurants, markets,</strong> and hidden foodie gems.<br />
    Savor authentic flavors and <strong>start your K-food journey!</strong> 🍲
</p>
                                    </div>

                                </ConceptCard>
                        
                        </div>
                    </section>
                </div>

                {/* Login Form (오른쪽 영역) - 로그인 전에만 표시 */}
                {!isLoggedIn && (
                    <div className="login-form-sidebar">
                        <div className="login-box">
                            <h2 className="login-title">✈ Sign In</h2>
                            <p className="login-subtitle">Join your K-Experience journey</p>
                            
                            {/* 에러 메시지: 인라인 스타일 제거, 클래스 적용 */}
                            {error && (
                                <div className="error-message-box">
                                    <span>{error}</span>
                                    <button 
                                        onClick={() => setError('')}
                                        className="error-close-button"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}
                            
                            <form className="login-form" onSubmit={handleSubmit}>
                                <label htmlFor="username">User ID</label>
                                <input 
                                    type="text" 
                                    id="username"
                                    name="username"
                                    placeholder="Enter your username" 
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="text-input"
                                    required
                                    autoComplete="username"
                                />
                                
                                <label htmlFor="password">Password</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        placeholder="••••••••••" 
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="text-input"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <span 
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </span>
                                </div>

                                <div className="remember-forgot">
                                    <label className="checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className="checkmark"></span>
                                        Remember me
                                    </label>
                                    <Link to="/forgot-password" className="forgot-password">Forgot?</Link>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    className="sign-in-button"
                                    disabled={loading}
                                    // 로딩 중 스타일은 CSS 파일의 .sign-in-button:disabled에서 처리
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </form>

                            <div className="social-login-divider"></div>
                            
                            <div className="sign-up-prompt">
                                Don't have an account? <Link to="/signup" className="sign-up-link">Sign up</Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ConceptMainPage;