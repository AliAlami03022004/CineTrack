import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">CineTrack</div>
      <nav className="navbar-links">
        <NavLink to="/home" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? "active" : ""}>Search</NavLink>
        <NavLink to="/discovery" className={({ isActive }) => isActive ? "active" : ""}>Discovery</NavLink>
      </nav>
    </header>
  );
}
