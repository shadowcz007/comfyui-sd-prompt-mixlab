if (document.body.querySelectorAll('#b_results .b_algo')) {
  Array.from(
    document.body.querySelectorAll('#b_results .b_algo'),
    ul => {
      let h2 = ul.querySelector('h2')
      let a = h2.querySelector('a')
      let b_caption = ul.querySelector('.b_caption')
      return {
        title: h2.innerText,
        url: a.href,
        caption: b_caption?.innerText
      }
    }
  ).filter(f => f.title)
 
}