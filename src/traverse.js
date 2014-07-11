// This file is the core of run.js and describes the basic transformations,  
// there syntax and how these are applied to trees. Because of the lazy nature
// of run.js the transformations are only applied once needed. Transforamtions 
// are speciefied in a declarative manner to optimize lazy evaluation. This 
// API should generally not be exposed to the user.  

/**
 * Check if the argument is a function
 */
function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
};

// Disjunctive normal form (DNF) is a normaized format that any boolean logic
// formular can be transformed to. This may incur in some cases an exponential
// growth of the resulting DNF formular. 
// 
// dnf  := [term]
// term := {truthy: [expression], falsey: [expression]}
//
// A term contains expressions that must all be truthy and falsey respectivly 
// for the term to evaluate true. For a dnf to evaluate true only a single term 
// in the array has to be true. So the outer array constitutes OR expressions 
// and the inner arrays are AND expressions.

/**
 * Resolve if an dnf expression is true or false
 * @param {object}   dnf      - the object containing the dnf expressions
 * @param {function} resolver - resolve a single expression to true or false
 */
function resolveDNF(dnf, resolver){

	function resolveInnerDNF(inner){
		if(!inner)return false;
		var t = inner.truthy || {};
		var f = inner.falsey || {};
		if(!t.length && !f.length){
			return resolver(inner);
		}

		var result = true;
		for(var i = 0; i < t.length; i++){
			result &= resolver(t[i]);
		}
		for(var i = 0; i < f.length; i++){
			result &= !resolver(f[i]);
		}
		return result;
	}

	var result = false;
	if(dnf && dnf.length){
		for(var i = 0; i < dnf.length; i++){
			result |= resolveInnerDNF(dnf[i]);
		}
	}else{
		result = resolveInnerDNF(dnf);
	}
	return !!result;
}

// Assertions are used to match and filter node objects. Attributes and
// properties can be compared. It has the form:
//
// assertion := {
// 	   type: string,        // optional, one of 'attr', 'prop', 'meta'
//     name: string,        // the key of the property to be tested
//     value: any,          // the reference value to be tested against
//     predicate: function  // predicate to evaluate the property 
// }

/**
 * Match a node against assertions
 */
function matchNode(node, dnfAssertions, meta){
	if(!dnfAssertions)return true;
	return resolveDNF(dnfAssertions, function(assertion){
		var value = node;
		if(assertion.type)value = node[assertion.type];
		if(assertion.type === 'meta')value = meta;
		value = (value||{})[assertion.name];
		return assertion.predicate(value, assertion.value);
	});
}

/**
 * Childreen class that contains a collection of nodes and exposes all basic
 * transformations that can be executed on the collection.
 */
function Childreen(array){
	this.target   = array ? array.slice(0) : [];
}

Childreen.prototype.append = function(element){
	this.target.push(element);
};

Childreen.prototype.insert = function(index, element){
	this.target.splice(index, 0, element);
};

Childreen.prototype.get = function(index, done){
	done(this.target[index]);
};

Childreen.prototype.each = function(each, dnfAssertions, start, done){
	var index = start||0;
	var self  = this;
	if(index >= this.target.length){
		return done && done();
	}
	function next(){
		self.each(each, done, dnfAssertions, index+1);
	}
	each(index, next);
};

Childreen.prototype.concat = function(childreen, index, done){
	var self = this;
	childreen.each(function(i){
		childreen.get(i, function(element){
			if(index >= 0){
				self.insert(index, element);
				index += 1;
			}else{
				self.append(element);
			}
		});
	}, null, null, done);
};

Childreen.prototype.remove = function(index, count){
	return this.target.splice(index, 1)[0];
};

Childreen.prototype.length = function(done){
	done(this.target.length);
};

Childreen.prototype.finite = function(done){
	done(true);
};

// Basic operations that are executed on a previously selected node. These 
// operations are a lot like bytecodes as there are compact, generic and
// meant to be generated from more high level transformations.
//
// A basic operation either changes atributes, properties or the array of 
// childreen of a node.
// 
// operation := {
//     toBeRun: boolean, // still has to be matched and run against this
//     applied: number,  // counts the number of childs this was propagated to
//     id: number,       // the id of this operation
//     ops: [basic],     // basic operations that will be executed
//     ...
// }
// 
// basic := {
//     name: 'wrap',
//     args: ['span'],
//     enabled: true
// }
// 
// Enabled can also be a function that would have access to the current nodes 
// attributes, state and context information. When falsey the operation will 
// not run.

/**
 * Global id generator to return ascending ids. 
 */
var ID = {
	current: 1,
	ascending: function(){
		return ID.current++;
	} 
}

/** 
 * Represents a tree node
 */
function Node(){
	this.attr = {};
	this.prop = {};
	this.tag  = null;
	this.text = null;

	this.childreen = new Childreen();
	this.pending   = []; // Array of pending operations
	this.previous  = {}; // Operations that are pending or true when allready run
	this.minimum   = -1; // Pending can't have an id less then this

	// TODO write methods to transform pending and operation.count
}

Node.prototype.transform = function(){
	// operations can only change childreen, attributes or properties

	// detach, append, insert, dowrap, unwrap, maping, seting, hassub
	// Traverse over subtree and produce result - hassub
};

/**
 * Propagate transformations of id <= maximum to the child at index
 * This is called on traversal to pass operations to childreen
 */
Node.prototype.propagate = function(index, maximum){
	// copy only to childreen if this transformation was not applied to parent
	
	// xyz.** -> detach does not detach all descendents of xyz only the childreen

	// But an operation can specifically attach new operations to this.
	// They have toBeRun=false and are then appliable to the childreen.
};


///////// TODO descibe contextual information that will be passed to opertations
// No bytecode stack but contextual information 
// Also contains meta information
// And Match state

/**
 *
 */
function Set(array){
	if(array.set)return array;

	var result = [];
	result.set = {};

	var oldpush = Array.prototype.push;
	result.push = function(element){
		var key = JSON.stringify(element);
		if(result.set[key]){
			oldpush.call(result, element);
			result.set[key] = true;	
		}
	}

	return result;
}

/**
 * Match a dom element and transform state
 * @param {object} node            - the dom node that will be matched
 * @param {object} previousMatches - current state to be transformed 
 * @param {number} maxLookAhead    - maximum transition look ahead
 */
function transition(node, previousMatches, maxLookAhead){

	// TODO cleanup names used:
	// transition, match, matches, before...

	var states   = previousMatches.states;
	var previous = previousMatches.matches;
	maxLookAhead = maxLookAhead || 2;
	var matches  = [];
	var counter  = 0;

	for(var i = 0; i < states.length; i++){
		var targetSet =  result.matches[i] = new Set([]);

		for(var ahead = 0; ahead <= maxLookAhead; ahead++){
			var iBefore = i - maxLookAhead + ahead;
			if(iBefore < 0)continue;

			for(var c = 0; c < previous[iBefore].length; c++){

				// todo check if these parameters are optimal
				var previousMatch = {
					position: iBefore,
					state: states[iBefore],
					states: states,
					context: previous[iBefore][c]
				};
				
				findPossibleTransitions(node, previousMatch, i, targetSet);
			}
		}
		counter += targetSet.length;
	}

	return {
		states:  states,
		matches: matches,
		hasMatches: counter > 0,
		hasEndState: (matches[matches.length-1] || []).length > 0;
	};

	// current contains all possible states
	// current has a coolection of states that the parent of element could have matched
	// if the last state matches current will 
}

function findPossibleTransitions(node, previousMatch, transitionToState, foundMatches){
	// todo next
}

function matchAttributes(){

}














































































