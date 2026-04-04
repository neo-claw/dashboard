*Sergey Levine*

**Lecture 2: Imitation Learning Part 1** (via Behavioral Cloning)
- state, observation, action --> policy
- $\pi(a | s)$  vs. $\pi(a | o)$ 
- state = concise, complete description of everything
- observation is a discrete snapshot of the state
- dependency graph:
	![[Pasted image 20260403141812.png]]
- if you know state **now**, state in the past does not matter to you because the state now is completely exhaustive
	- i.e. $s_3$ is conditionally independent of $s_1$ given $s_2$
	- Known as Markov Property
	![[Pasted image 20260403142140.png]]
- **observations and states are not the same**, some algorithms work well with just observations, others require the fully observed state
- Behavioral cloning: collecting human data, encoding it such that a machine can interpret the actions and observations, and training a policy
	- example in lecture is a truck driver, steering, camera, and supervised learning
	- does it work? **NO!**
- Issue: little mistakes put you into more and more unfamiliar states
	![[Pasted image 20260403144044.png]]
	- Doesn't happen in regular supervised learning because IID -- we assume each state doesnt affect the next state
- Nvidia made it work tho:
	![[Pasted image 20260403144217.png]]
	- They used left and right camera to show what the model would've seen if it took a left / right instead of the opposite
		- This made their data go much farther
	![[Pasted image 20260403144503.png]]

**Lecture 2: Imitation Learning Part 2**
- Math behind why behavioral cloning fails
- Mistakes scale with the upper bound $O(eT^2$) 
	![[Pasted image 20260403150254.png]]

**Lecture 2: Imitation Learning Part** 3
- Can augment data (sometimes make mistakes and correct them to imrpove failure resolution)
- Problem 1) Solve for non-markovian behavior using history:
	![[Pasted image 20260403151442.png]]
	- Although, this may not work well
	- Causal confusion: policy could attend to the incorrect subject
- Problem 2) Solve for multi-modal behavior
	- More expressive continuous distribution
		- Use mixture of Gaussians instead of just 1 
			- **TODO: learn about Gaussians and mixture of Gaussians**
		- Latent variable models
			- Pass in another input *C* into the network that modifies the Gaussian node
			- Need to use conditional variational autoencoder for this
			- **TODO: learn about this
			- Then at test-time you choose a random variable to pass in and make a decision
		- Diffusion models
			- ![[Pasted image 20260403152552.png]]
			- **TODO: learn about this
	- **Discretization** distribution
		- Use autoregressive discretization
		![[Pasted image 20260403152805.png]]
	**Lecture 2: Imitation Learning Part** 5
	- ![[Pasted image 20260403153743.png]]
	- 