---
file_format: mystnb
kernelspec:
  name: python3
---


# Controlled and daggered gates: decomposition reference

This guide is organised by the gate being modified. Each entry states the native cases, the controlled decomposition, and the dagger rule. The decompositions describe logical gates; subsequent compilation determines the hardware gate set.

## Gate index

- [X](#x)
- [CX](#cx)
- [Toffoli](#toffoli)
- [Y](#y)
- [CY](#cy)
- [Z](#z)
- [CZ](#cz)
- [H](#h)
- [Rx](#rx)
- [Ry](#ry)
- [Rz](#rz)
- [CRz](#crz)
- [S and Sdg](#s-and-sdg)
- [T and Tdg](#t-and-tdg)
- [V and Vdg](#v-and-vdg)
- [Global phase](#global-phase)

See also the [worked examples](#worked-examples) for explicit circuits and dirty-ancilla restoration.

## Notation and phase conventions

All rotation parameters are in **half-turns**:

$$
R_P(\theta)=\exp\!\left(-\frac{i\pi\theta}{2}P\right),
\qquad P\in\{X,Y,Z\}.
$$

For example, $\theta=1/2$ means a rotation through $\pi/2$ radians. Define the scalar phase $\Phi(\alpha)=e^{i\pi\alpha}I$.

For a register of positive controls $C=(c_1,\ldots,c_k)$,

$$
\Lambda_C(U)
=\left(I-|1^k\rangle\langle1^k|\right)\otimes I
+|1^k\rangle\langle1^k|\otimes U.
$$

The gate acts only when every control is $1$. All identities hold for coherent controls, including superposition and entanglement. For an empty register, $\Lambda_\varnothing(U)=U$.

**Sequences are written in execution order, from left to right.** Thus $A\ ;\ B$ means apply $A$ and then $B$, with matrix $BA$. Subscripts identify the target; $\Lambda_c(U_t)$ has control $c$ and target $t$.

In entries for gates that already have controls, $C$ denotes the **additional** controls; the formulas explicitly include the original controls.

Control and dagger commute:

$$
\Lambda_C(U)^\dagger=\Lambda_C(U^\dagger).
$$

A decomposed circuit is daggered by reversing execution order and taking the adjoint of each factor.

Unless marked $\simeq$, the identities below are exact with scalar phases retained. The compiler removes remaining unconditional scalar phases after modifier resolution. Consequently, the final circuit is equivalent up to an overall global phase; conditional phases remain implemented on the controls.

## X

**Native cases.** With one control, emit CX. With two controls, emit Toffoli. Larger control registers use one of the following recursive constructions.

### With a dirty ancilla

Write the full control register as $(C_1,C_2,x,y)$. The two designated controls $x,y$ form a Toffoli together with target $t$. If there are $k$ remaining controls, partition them with

$$
|C_1|=\lfloor k/2\rfloor,\qquad |C_2|=k-|C_1|.
$$

For a borrowed dirty ancilla $a$, define

$$
A=\Lambda_{C_1,x,y}(X_a),\qquad
B=\Lambda_{C_2,a}(X_t).
$$

Then

$$
\boxed{
\Lambda_{C_1,C_2,x,y}(X_t)=A\ ;\ B\ ;\ A\ ;\ B,
}
$$

with identity action on $a$ after the complete sequence. Each block is recursively decomposed until native cases are reached.

A dirty ancilla may start in an arbitrary state and may be entangled. To see that it is restored, let

$$
p=\left(\bigwedge C_1\right)xy,\qquad q=\bigwedge C_2.
$$

An empty conjunction equals $1$. The two $A$ blocks change a basis value $a_0$ to $a_0\oplus p$ and back to $a_0$. The two $B$ blocks produce the net target toggle

$$
q(a_0\oplus p)\oplus qa_0=pq.
$$

There are no basis-dependent phases, so the identity also restores arbitrary superpositions and entanglement.

For example, a three-controlled X with controls $(x,y,c)$ uses

$$
\operatorname{Toffoli}(x,y;a)\ ;\
\operatorname{Toffoli}(c,a;t)\ ;\
\operatorname{Toffoli}(x,y;a)\ ;\
\operatorname{Toffoli}(c,a;t).
$$

### Without an available dirty ancilla

Split the full control register as $(D,c)$. Using the phase-normalised square root $V^2=X$, the compiler uses

$$
\boxed{
\begin{aligned}
\Lambda_{D,c}(X_t)
={}&\Lambda_c(V_t)\ ;\ \Lambda_D(X_c)\ ;\\
&\Lambda_c(V_t^\dagger)\ ;\ \Lambda_D(X_c)\ ;\
\Lambda_D(V_t).
\end{aligned}
}
$$

The selected control $c$ is toggled and restored. If $p=\bigwedge D$, the net target action is

$$
V^{c-(c\oplus p)+p}=V^{2cp}=X^{cp}.
$$

The controlled V blocks use the [V decomposition](#v-and-vdg). Recursive subproblems can borrow $t$ while modifying $c$, or borrow the restored $c$ for the final controlled V. These borrowed qubits are restored before the subproblem returns. Thus this construction needs no additional qubit for the enclosing gate, although recursive subproblems can use dirty-ancilla identities.

**Dagger.** $X^\dagger=X$, and every multi-controlled X is self-adjoint.

## CX

Let $c$ be the original control and $t$ the target. Adding controls $C$ gives

$$
\Lambda_C(\operatorname{CX}_{c,t})=\Lambda_{C,c}(X_t).
$$

With one additional control, emit native Toffoli. With two or more additional controls, use the [multi-controlled X constructions](#x) with the original control included in the full control register.

**Dagger.** CX and all its controlled versions are self-adjoint.

## Toffoli

Let $x,y$ be the original controls and $t$ the target. Adding controls $C$ gives

$$
\Lambda_C(\operatorname{Toffoli}_{x,y;t})=\Lambda_{C,x,y}(X_t).
$$

With no additional controls, retain native Toffoli. With additional controls, use the [multi-controlled X constructions](#x). In the dirty-ancilla construction, retain $x,y$ as the designated controls and partition the additional register $C$ into $C_1,C_2$.

**Dagger.** Toffoli and all its controlled versions are self-adjoint.

## Y

**One control.** Emit native CY.

**Two or more controls.** Use

$$
\boxed{
\Lambda_C(Y_t)=S_t^\dagger\ ;\ \Lambda_C(X_t)\ ;\ S_t.
}
$$

The S gates are unconditional. This follows from $SXS^\dagger=Y$; in inactive control sectors, $S^\dagger$ and S cancel. Resolve the central gate using the [X entry](#x).

**Dagger.** Y and every controlled Y are self-adjoint.

## CY

For original control $c$, target $t$, and additional controls $C$,

$$
\boxed{
\Lambda_C(\operatorname{CY}_{c,t})
=S_t^\dagger\ ;\ \Lambda_{C,c}(X_t)\ ;\ S_t.
}
$$

Retain native CY when there are no additional controls. Otherwise use the displayed identity and the [X entry](#x), including $c$ among the central gate's controls.

**Dagger.** CY and every controlled CY are self-adjoint.

## Z

**One control.** Emit native CZ.

**Two or more controls.** Use

$$
\boxed{
\Lambda_C(Z_t)=H_t\ ;\ \Lambda_C(X_t)\ ;\ H_t.
}
$$

The H gates are unconditional. The identity follows from $HXH=Z$, and the basis changes cancel in inactive control sectors. Resolve the central gate using the [X entry](#x).

**Dagger.** Z and every controlled Z are self-adjoint.

## CZ

For original control $c$, target $t$, and additional controls $C$,

$$
\boxed{
\Lambda_C(\operatorname{CZ}_{c,t})
=H_t\ ;\ \Lambda_{C,c}(X_t)\ ;\ H_t.
}
$$

Retain native CZ when there are no additional controls. Otherwise use the displayed identity and the [X entry](#x).

**Dagger.** CZ and every controlled CZ are self-adjoint.

## H

For any nonempty control register,

$$
\boxed{
\Lambda_C(H_t)=\Lambda_C(R_{y,t}(1/2))\ ;\ \Lambda_C(X_t).
}
$$

Both factors carry the full control register. In the active sector, $XR_y(1/2)=H$; in inactive sectors, both factors are identity. Resolve the factors using the [Ry](#ry) and [X](#x) entries.

**Dagger.** H is self-adjoint. The adjoint decomposition is

$$
\Lambda_C(X_t)\ ;\ \Lambda_C(R_{y,t}(-1/2)),
$$

which implements the same controlled H.

## Rx

For any nonempty control register,

$$
\boxed{
\Lambda_C(R_{x,t}(\theta))
=H_t\ ;\ \Lambda_C(R_{z,t}(\theta))\ ;\ H_t.
}
$$

The H gates are unconditional. The identity follows from $HZH=X$, and they cancel in inactive control sectors. Resolve the central gate using the [Rz entry](#rz).

**Dagger.** Replace $\theta$ by $-\theta$.

## Ry

For any nonempty control register,

$$
\boxed{
\Lambda_C(R_{y,t}(\theta))
=S_t^\dagger\ ;\ \Lambda_C(R_{x,t}(\theta))\ ;\ S_t.
}
$$

The S gates are unconditional. This follows from $SXS^\dagger=Y$. Resolve the central gate using the [Rx entry](#rx).

**Dagger.** Replace $\theta$ by $-\theta$.

## Rz

**One control.** Emit native CRz with the same parameter $\theta$.

**Two or more controls.** Use the half-angle decomposition

$$
\boxed{
\Lambda_C(R_{z,t}(\theta))
=R_{z,t}(\theta/2)\ ;\ \Lambda_C(X_t)\ ;\
R_{z,t}(-\theta/2)\ ;\ \Lambda_C(X_t).
}
$$

Both rotations are unconditional; both X gates carry the full control register. Resolve the X blocks using the [X entry](#x).

In inactive control sectors, the rotations cancel. In the active sector, the target matrix is

$$
XR_z(-\theta/2)XR_z(\theta/2)=R_z(\theta),
$$

using $XR_z(\beta)X=R_z(-\beta)$.

The parameter can be evaluated at runtime: the decomposition requires only halving and negation.

**Dagger.** Replace $\theta$ by $-\theta$.

## CRz

Let $c$ be the original control and $t$ the target. With additional controls $C$,

$$
\Lambda_C(\operatorname{CRz}_{c,t}(\theta))
=\Lambda_{C,c}(R_{z,t}(\theta)).
$$

Retain native CRz when there are no additional controls. Otherwise use

$$
\boxed{
R_{z,t}(\theta/2)\ ;\ \Lambda_{C,c}(X_t)\ ;\
R_{z,t}(-\theta/2)\ ;\ \Lambda_{C,c}(X_t).
}
$$

The original control $c$ participates in both X blocks. Their decomposition is given in the [X entry](#x).

**Dagger.** Replace $\theta$ by $-\theta$.

## S and Sdg

The exact gate identities are

$$
S=\Phi(1/4)R_z(1/2),\qquad
S^\dagger=\Phi(-1/4)R_z(-1/2).
$$

For any nonempty control register,

$$
\boxed{
\Lambda_C(S_t)
=\Lambda_C(R_{z,t}(1/2))\ ;\ P_C(1/4),
}
$$

$$
\boxed{
\Lambda_C(S_t^\dagger)
=\Lambda_C(R_{z,t}(-1/2))\ ;\ P_C(-1/4).
}
$$

Here $P_C(\alpha)$ applies phase $e^{i\pi\alpha}$ to the all-ones control state. It acts on the controls, independently of the target. Resolve it using the [global-phase entry](#global-phase), and the rotation using [Rz](#rz).

For one control, the exact decomposition is

$$
\Lambda_c(S_t)
=\operatorname{CRz}_{c,t}(1/2)\ ;\
R_{z,c}(1/4)\ ;\ \Phi(1/8).
$$

The final scalar is removed after modifier resolution. The rotation on $c$ remains essential to the controlled S operation.

**Dagger.** Exchange S and Sdg; both the rotation parameter and phase parameter change sign.

## T and Tdg

The exact gate identities are

$$
T=\Phi(1/8)R_z(1/4),\qquad
T^\dagger=\Phi(-1/8)R_z(-1/4).
$$

For any nonempty control register,

$$
\boxed{
\Lambda_C(T_t)
=\Lambda_C(R_{z,t}(1/4))\ ;\ P_C(1/8),
}
$$

$$
\boxed{
\Lambda_C(T_t^\dagger)
=\Lambda_C(R_{z,t}(-1/4))\ ;\ P_C(-1/8).
}
$$

Resolve the conditional phase using the [global-phase entry](#global-phase), and the rotation using [Rz](#rz).

For one control, the exact decomposition is

$$
\Lambda_c(T_t)
=\operatorname{CRz}_{c,t}(1/4)\ ;\
R_{z,c}(1/8)\ ;\ \Phi(1/16).
$$

Only the final unconditional scalar is removed after modifier resolution.

**Dagger.** Exchange T and Tdg; both the rotation parameter and phase parameter change sign.

## V and Vdg

These decompositions use the phase-normalised square root of X:

$$
V=\Phi(1/4)R_x(1/2),\qquad V^2=X,
$$

$$
V^\dagger=\Phi(-1/4)R_x(-1/2).
$$

For any nonempty control register,

$$
\boxed{
\Lambda_C(V_t)
=\Lambda_C(R_{x,t}(1/2))\ ;\ P_C(1/4),
}
$$

$$
\boxed{
\Lambda_C(V_t^\dagger)
=\Lambda_C(R_{x,t}(-1/2))\ ;\ P_C(-1/4).
}
$$

Resolve the rotation using [Rx](#rx), and the conditional phase using the [global-phase entry](#global-phase).

For one control, this becomes

$$
\Lambda_c(V_t)
=H_t\ ;\ \operatorname{CRz}_{c,t}(1/2)\ ;\ H_t\ ;\
R_{z,c}(1/4)\ ;\ \Phi(1/8).
$$

The phase correction is essential to the [multi-controlled X construction](#x). Substituting $R_x(1/2)$ alone would give a square of $-iX$, changing the operation in the active control sector.

**Dagger.** Exchange V and Vdg; both the rotation parameter and phase parameter change sign.

## Global phase

A scalar phase becomes a conditional phase when controlled:

$$
P_C(\alpha)=\Lambda_C(\Phi(\alpha)).
$$

For nonempty $C$, this gate multiplies the all-ones control state by $e^{i\pi\alpha}$ and leaves every other basis state unchanged. There is no separate target qubit.

Split $C=(D,c)$. The recursive decomposition is

$$
\boxed{
P_{D,c}(\alpha)
=P_D(\alpha/2)\ ;\ \Lambda_D(R_{z,c}(\alpha)).
}
$$

When $D$ is inactive, both factors are identity. When $D$ is active,

$$
e^{i\pi\alpha/2}R_z(\alpha)
=\operatorname{diag}(1,e^{i\pi\alpha}).
$$

The base case is $P_\varnothing(\alpha)=\Phi(\alpha)$. For example,

$$
P_c(\alpha)=\Phi(\alpha/2)\ ;\ R_{z,c}(\alpha),
$$

$$
P_{c_1,c_2}(\alpha)
=\Phi(\alpha/4)\ ;\ R_{z,c_1}(\alpha/2)\ ;\
\operatorname{CRz}_{c_1,c_2}(\alpha).
$$

For $k$ controls, the recursion produces rotations with $0,1,\ldots,k-1$ controls, with parameters

$$
\frac{\alpha}{2^{k-1}},\ \frac{\alpha}{2^{k-2}},\ \ldots,\ \alpha,
$$

and a remaining scalar $\Phi(\alpha/2^k)$. Resolve each controlled rotation using [Rz](#rz). Only the remaining unconditional scalar is discarded after all controls have been resolved.

**Dagger.** Replace $\alpha$ by $-\alpha$.


## Worked examples

The examples use the same left-to-right execution order and half-turn parameters as the reference entries.

### Example 1: controlled T and Tdg

Consider T on target $t$ with one control $c$. Its decomposition is

$$
\Lambda_c(T_t)
=\operatorname{CRz}_{c,t}(1/4)\ ;\ R_{z,c}(1/8)\ ;\ \Phi(1/16).
$$

The controlled rotation acts on $t$; the phase-correction rotation acts on $c$. The scalar $\Phi(1/16)$ is removed after modifier resolution, giving the emitted logical circuit

$$
\boxed{
\operatorname{CRz}_{c,t}(1/4)\ ;\ R_{z,c}(1/8).
}
$$

The exact controlled T has matrix $\operatorname{diag}(1,1,1,e^{i\pi/4})$ in the basis $|ct\rangle$. The displayed circuit implements this matrix multiplied by the common scalar $e^{-i\pi/16}$.

The daggered version changes both signs:

$$
\Lambda_c(T_t^\dagger)
=\operatorname{CRz}_{c,t}(-1/4)\ ;\ R_{z,c}(-1/8)\ ;\ \Phi(-1/16).
$$

After removal of the scalar, the circuit is

$$
\boxed{
\operatorname{CRz}_{c,t}(-1/4)\ ;\ R_{z,c}(-1/8).
}
$$

In both cases, the rotation on the control is required to obtain the correct relative phase between control sectors.

### Example 2: doubly controlled daggered Rx

Consider $R_x(1/2)^\dagger$ on $t$ with controls $c_1,c_2$. First negate the parameter:

$$
\Lambda_{c_1,c_2}(R_{x,t}(1/2)^\dagger)
=\Lambda_{c_1,c_2}(R_{x,t}(-1/2)).
$$

Change basis using H, and expand the doubly controlled Rz with half-angle rotations. The two controlled X blocks are native Toffolis:

$$
\boxed{
\begin{aligned}
&H_t\ ;\ R_{z,t}(-1/4)\ ;\
\operatorname{Toffoli}(c_1,c_2;t)\ ;\\
&R_{z,t}(1/4)\ ;\
\operatorname{Toffoli}(c_1,c_2;t)\ ;\ H_t.
\end{aligned}
}
$$

Here $\operatorname{Toffoli}(x,y;z)$ has controls $x,y$ and target $z$.

When either control is zero, the Toffolis are inactive, the Rz rotations cancel, and the H gates cancel. When both controls are one, the central sequence has matrix

$$
XR_z(1/4)XR_z(-1/4)=R_z(-1/2).
$$

Conjugating by H gives $R_x(-1/2)$, as required. This example uses no borrowed ancilla and needs no phase correction.

### Example 3: four-controlled X borrowing its target as a dirty ancilla

Consider $\Lambda_{c_1,c_2,c_3,c_4}(X_t)$ with the controls ordered as $(c_1,c_2,c_3,c_4)$. The normal pass begins resolution of the original gate with an empty ancilla list. Its five-block decomposition is

$$
\begin{aligned}
&\Lambda_{c_4}(V_t)\ ;\
\underbrace{\Lambda_{c_1,c_2,c_3}(X_{c_4})}_{\text{borrow }t}\ ;\\
&\Lambda_{c_4}(V_t^\dagger)\ ;\
\underbrace{\Lambda_{c_1,c_2,c_3}(X_{c_4})}_{\text{borrow }t}\ ;\
\Lambda_{c_1,c_2,c_3}(V_t).
\end{aligned}
$$

The controlled V factors are subsequently resolved using the [V entry](#v-and-vdg). Within each highlighted X block, $c_4$ is the target and the existing qubit $t$ is temporarily available as a dirty ancilla.

Each highlighted block is implemented as

$$
\boxed{
\begin{aligned}
&\operatorname{Toffoli}(c_2,c_3;t)\ ;\
\operatorname{Toffoli}(c_1,t;c_4)\ ;\\
&\operatorname{Toffoli}(c_2,c_3;t)\ ;\
\operatorname{Toffoli}(c_1,t;c_4).
\end{aligned}
}
$$

To track restoration, write $p=c_2c_3$, $q=c_1$, and let the initial basis values of $t,c_4$ at entry to the block be $a,b$:

| Step | Borrowed qubit $t$ | Subproblem target $c_4$ |
|---|---|---|
| Initially | $a$ | $b$ |
| First Toffoli | $a\oplus p$ | $b$ |
| Second Toffoli | $a\oplus p$ | $b\oplus q(a\oplus p)$ |
| Third Toffoli | $a$ | $b\oplus q(a\oplus p)$ |
| Fourth Toffoli | $a$ | $b\oplus pq$ |

Thus $c_4$ flips exactly when $c_1c_2c_3=1$, while $t$ is restored exactly to its state at entry to the block.

The sequence introduces no basis-dependent phases, so restoration also holds for superpositions and entanglement. In particular, $t$ may already be entangled with $c_4$ by the preceding controlled V.

After the borrowed-qubit block returns, the enclosing decomposition continues to use $t$ as its original target. No additional qubit is allocated: the dirty workspace is provided internally by recursive borrowing.
